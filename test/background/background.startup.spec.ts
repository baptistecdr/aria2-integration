import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Downloads } from "webextension-polyfill";
import { captureURL, isChromium } from "@/aria2-extension";
import browser from "../setupTests";

vi.mock("@/aria2-extension", () => ({
  captureTorrentFromURL: vi.fn(),
  captureURL: vi.fn().mockResolvedValue(undefined),
  isChromium: vi.fn().mockReturnValue(false),
  isFirefox: vi.fn().mockReturnValue(true),
  showNotification: vi.fn(),
}));

vi.mock("@/current-tab-provider", () => ({
  findCurrentTab: vi.fn().mockResolvedValue(undefined),
}));

const SERVER_UUID = "6f1c7a3e-2b4d-4e8f-9a1b-3c5d7e9f1a2b";
const OPTIONS = {
  servers: { [SERVER_UUID]: { uuid: SERVER_UUID, name: "aria2", host: "127.0.0.1", port: 6800 } },
  captureDownloads: true,
  captureServer: SERVER_UUID,
};

// Regression tests for https://github.com/baptistecdr/aria2-integration/issues/1356: after a browser restart, the
// background page is only started by the download event itself, which is dispatched before the options are loaded.
describe("Background startup", () => {
  let resolveStorage: (value: Record<string, unknown>) => void;

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(captureURL).mockClear();
    browser.storage.sync.get.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStorage = resolve;
      }),
    );
    browser.downloads.cancel = vi.fn().mockResolvedValue(undefined);
    browser.downloads.erase = vi.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.mocked(isChromium).mockReturnValue(false);
  });

  const downloadItem = () => ({ id: 1, filename: "/downloads/file.bin", url: "https://example.com/file.bin", totalBytes: 1024 }) as Downloads.DownloadItem;

  it("captures a download created before the options are loaded on Firefox", async () => {
    const { listenerOnDownloadCreated } = await import("@/background/background");

    const listener = listenerOnDownloadCreated(downloadItem());
    resolveStorage({ options: JSON.stringify(OPTIONS) });
    await listener;

    await vi.waitFor(() => expect(captureURL).toHaveBeenCalledOnce());
  });

  it("captures a download created before the options are loaded on Chromium", async () => {
    vi.mocked(isChromium).mockReturnValue(true);
    const { listenerOnDownloadChanged, listenerOnDownloadCreated } = await import("@/background/background");

    await listenerOnDownloadCreated({ ...downloadItem(), filename: "" });
    const listener = listenerOnDownloadChanged({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });
    resolveStorage({ options: JSON.stringify(OPTIONS) });
    await listener;

    await vi.waitFor(() => expect(captureURL).toHaveBeenCalledOnce());
  });

  it("does not capture a download when capture downloads is disabled", async () => {
    const { listenerOnDownloadCreated } = await import("@/background/background");

    const listener = listenerOnDownloadCreated(downloadItem());
    resolveStorage({ options: JSON.stringify({ ...OPTIONS, captureDownloads: false }) });
    await listener;

    expect(captureURL).not.toHaveBeenCalled();
  });
});
