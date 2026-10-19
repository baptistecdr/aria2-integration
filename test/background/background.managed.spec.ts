import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { listenerOnCommand, listenerStorageOnChanged } from "@/background/background";

describe("Managed options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (browser.storage as any).managed;
  });

  it.each([{ captureDownloads: true }, { captureServer: "0b6a1f9e-3c2d-4e5f-8a9b-1c2d3e4f5a6b" }])(
    "should not toggle capture downloads when it is managed (%o)",
    async (managedOptions) => {
      (browser.storage as any).managed = { get: vi.fn().mockResolvedValue(managedOptions) };

      await listenerOnCommand("toggle_capture_downloads");

      expect(browser.storage.sync.set).not.toHaveBeenCalled();
      expect(browser.notifications.create).toHaveBeenCalledWith(undefined, expect.objectContaining({ message: "Translated: toggleCaptureDownloadsManaged" }));
    },
  );

  it("should reload options when the policy changes", async () => {
    await listenerStorageOnChanged({ captureDownloads: { newValue: true } }, "managed");

    expect(browser.storage.sync.get).toHaveBeenCalled();
  });

  it("should ignore changes to other storage keys", async () => {
    await listenerStorageOnChanged({ other: { newValue: true } }, "local");

    expect(browser.storage.sync.get).not.toHaveBeenCalled();
  });
});
