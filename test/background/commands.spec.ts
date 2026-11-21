import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { createCommandHandler, OPEN_POPUP_COMMAND, TOGGLE_CAPTURE_DOWNLOADS_COMMAND } from "@/background/commands";
import type { Connections } from "@/background/connections";
import { Server } from "@/domain/server";
import { showNotification } from "@/platform/notifications";
import { fakeOptionsStore } from "../helpers/fake-options-store";

vi.mock("@/platform/notifications", () => ({
  showNotification: vi.fn(),
}));

describe("Commands", () => {
  const connections: Connections = { get: vi.fn(), all: () => [] };
  const server1 = Server.create({ uuid: "server1", name: "First" });
  const server2 = Server.create({ uuid: "server2", name: "Second" });

  beforeEach(() => {
    vi.clearAllMocks();
    (browser.action as any).openPopup = vi.fn().mockResolvedValue(undefined);
  });

  it("opens the popup", async () => {
    await createCommandHandler({ store: fakeOptionsStore(), connections })(OPEN_POPUP_COMMAND);

    expect(browser.action.openPopup).toHaveBeenCalled();
  });

  it("opens the popup without waiting for the options, to keep the user input status", async () => {
    const store = fakeOptionsStore();

    await createCommandHandler({ store, connections })(OPEN_POPUP_COMMAND);

    expect(store.ready).not.toHaveBeenCalled();
  });

  it("enables capture downloads on the capture server", async () => {
    const store = fakeOptionsStore({ servers: { server1, server2 }, captureServer: "server2" });

    await createCommandHandler({ store, connections })(TOGGLE_CAPTURE_DOWNLOADS_COMMAND);

    expect(store.get().captureDownloads).toBe(true);
    expect(store.get().captureServer).toBe("server2");
    expect(showNotification).toHaveBeenCalledWith("Translated: toggleCaptureDownloadsEnabled");
  });

  it("enables capture downloads on the first server when no capture server is set", async () => {
    const store = fakeOptionsStore({ servers: { server1, server2 } });

    await createCommandHandler({ store, connections })(TOGGLE_CAPTURE_DOWNLOADS_COMMAND);

    expect(store.get().captureDownloads).toBe(true);
    expect(store.get().captureServer).toBe("server1");
  });

  it("disables capture downloads", async () => {
    const store = fakeOptionsStore({ servers: { server1 }, captureServer: "server1", captureDownloads: true });

    await createCommandHandler({ store, connections })(TOGGLE_CAPTURE_DOWNLOADS_COMMAND);

    expect(store.get().captureDownloads).toBe(false);
    expect(showNotification).toHaveBeenCalledWith("Translated: toggleCaptureDownloadsDisabled");
  });

  it("tells the user to add a server first when there is none", async () => {
    const store = fakeOptionsStore();

    await createCommandHandler({ store, connections })(TOGGLE_CAPTURE_DOWNLOADS_COMMAND);

    expect(store.get().captureDownloads).toBe(false);
    expect(showNotification).toHaveBeenCalledWith("Translated: toggleCaptureDownloadsNoServer");
  });

  it("tells the user the policy sets capture downloads instead of toggling it", async () => {
    const store = fakeOptionsStore({ servers: { server1 }, captureServer: "server1", captureDownloads: true }, ["captureDownloads"]);

    await createCommandHandler({ store, connections })(TOGGLE_CAPTURE_DOWNLOADS_COMMAND);

    expect(store.update).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith("Translated: toggleCaptureDownloadsManaged");
  });

  it("tells the user there is no server when the capture server set by the policy does not exist", async () => {
    const store = fakeOptionsStore({ servers: { server1 }, captureServer: "missing-server" }, ["captureServer"]);

    await createCommandHandler({ store, connections })(TOGGLE_CAPTURE_DOWNLOADS_COMMAND);

    expect(store.get().captureDownloads).toBe(false);
    expect(showNotification).toHaveBeenCalledWith("Translated: toggleCaptureDownloadsNoServer");
  });

  it("toggles capture downloads on the capture server set by the policy", async () => {
    const store = fakeOptionsStore({ servers: { server1, server2 }, captureServer: "server2" }, ["captureServer"]);

    await createCommandHandler({ store, connections })(TOGGLE_CAPTURE_DOWNLOADS_COMMAND);

    expect(store.get()).toMatchObject({ captureDownloads: true, captureServer: "server2" });
  });
});
