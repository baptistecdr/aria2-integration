import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POLL_INTERVAL_MS, useAria2Tasks } from "@/popup/hooks/use-aria2-tasks";
import type { Aria2Client } from "@/services/aria2-client";

const globalStat = { downloadSpeed: 0, uploadSpeed: 0, numActive: 1, numWaiting: 2, numStopped: 3, numStoppedTotal: 3 };

function fakeClient() {
  return {
    getGlobalStat: vi.fn().mockResolvedValue(globalStat),
    getTasks: vi.fn().mockResolvedValue([{ gid: "gid-1" }]),
  } as unknown as Aria2Client & { getGlobalStat: ReturnType<typeof vi.fn>; getTasks: ReturnType<typeof vi.fn> };
}

describe("useAria2Tasks", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is loading until the server answers, then returns its statistics and tasks", async () => {
    const client = fakeClient();

    const { result } = renderHook(() => useAria2Tasks(client));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(false);
    expect(result.current.globalStat).toEqual(globalStat);
    expect(result.current.tasks).toEqual([{ gid: "gid-1" }]);
    expect(client.getTasks).toHaveBeenCalledWith(2, 3);
  });

  it("reports a failure when the server can't be reached", async () => {
    const client = fakeClient();
    client.getGlobalStat.mockRejectedValue(new Error("unreachable"));

    const { result } = renderHook(() => useAria2Tasks(client));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.loading).toBe(false);
  });

  it("polls the server again after the poll interval, and recovers from failures", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = fakeClient();
    client.getGlobalStat.mockRejectedValueOnce(new Error("unreachable"));

    const { result } = renderHook(() => useAria2Tasks(client));
    await waitFor(() => expect(result.current.failed).toBe(true));

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(client.getGlobalStat).toHaveBeenCalledTimes(2);
  });

  it("stops polling once unmounted", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = fakeClient();
    const { result, unmount } = renderHook(() => useAria2Tasks(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    unmount();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

    expect(client.getGlobalStat).toHaveBeenCalledTimes(1);
  });

  it("starts over when the client changes, instead of showing the previous server's tasks", async () => {
    const oldClient = fakeClient();
    const newClient = fakeClient();
    // The new server has not answered yet.
    newClient.getGlobalStat.mockReturnValue(new Promise(() => {}));
    const { result, rerender } = renderHook(({ client }) => useAria2Tasks(client), { initialProps: { client: oldClient } });
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    rerender({ client: newClient });

    expect(result.current.loading).toBe(true);
    expect(result.current.tasks).toEqual([]);
  });
});
