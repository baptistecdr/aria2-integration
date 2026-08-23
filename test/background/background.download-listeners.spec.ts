import { expect, vi } from "vitest";
import type { Downloads } from "webextension-polyfill";
import { listenerOnDownloadChanged, listenerOnDownloadCreated } from "@/background/background";

vi.mock("@/aria2-extension", () => ({
  captureTorrentFromURL: vi.fn(),
  captureURL: vi.fn(),
  isChromium: vi.fn().mockReturnValue(true),
  isFirefox: vi.fn().mockReturnValue(false),
  showNotification: vi.fn(),
}));

vi.mock("@/current-tab-provider", () => ({
  findCurrentTab: vi.fn().mockResolvedValue(undefined),
}));

describe("Download Listeners", () => {
  describe("listenerOnDownloadChanged", () => {
    it("should not throw when the download item is not tracked", async () => {
      // Regression test: browser.downloads.onChanged fires for every download on Chromium, but downloadItems
      // only ever contains items that already passed the capture filter. Most events reference an id we never
      // tracked, so this must be a safe no-op rather than crash on `downloadItem.id` of an undefined lookup.
      const downloadDelta = { id: 123456 } as Downloads.OnChangedDownloadDeltaType;

      await expect(listenerOnDownloadChanged(downloadDelta)).resolves.toBeUndefined();
    });
  });

  describe("listenerOnDownloadCreated", () => {
    it("should not throw when capture downloads is disabled", async () => {
      const downloadItem = { id: 1, filename: "", url: "https://example.com/file.zip" } as Downloads.DownloadItem;

      await expect(listenerOnDownloadCreated(downloadItem)).resolves.toBeUndefined();
    });
  });
});
