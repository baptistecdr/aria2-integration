import { beforeEach, describe, expect, it, vi } from "vitest";
import { showNotification } from "@/platform/notifications";
import { runWithNotification } from "@/services/notify";

vi.mock("@/platform/notifications", () => ({
  showNotification: vi.fn(),
}));

describe("runWithNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the success notification when the action succeeds", async () => {
    const succeeded = await runWithNotification(async () => {}, { success: "added", error: "failed" });

    expect(succeeded).toBe(true);
    expect(showNotification).toHaveBeenCalledExactlyOnceWith("added");
  });

  it("logs the error and shows the error notification when the action fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");

    const succeeded = await runWithNotification(() => Promise.reject(error), { success: "added", error: "failed" });

    expect(succeeded).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(showNotification).toHaveBeenCalledExactlyOnceWith("failed");
    consoleErrorSpy.mockRestore();
  });

  it("stays silent when no notification is given", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await runWithNotification(async () => {}, {});
    await runWithNotification(() => Promise.reject(new Error("boom")), {});

    expect(showNotification).not.toHaveBeenCalled();
  });
});
