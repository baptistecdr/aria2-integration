import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Downloads } from "webextension-polyfill";
import browser from "webextension-polyfill";
import { captureURL, isChromium } from "@/aria2-extension";
import { listenerOnDownloadChanged, listenerOnDownloadCreated } from "@/background/background";
import { ExtensionOptions } from "@/models/extension-options";
import { Server } from "@/models/server";

// Regression test for https://github.com/baptistecdr/aria2-integration/issues/1356
// The background script is non-persistent: after a browser restart it is started by the download event itself, so the
// download listener runs before the stored options are loaded. It must wait for them instead of using the defaults.
const storage = vi.hoisted(() => {
  let resolve: (value: Record<string, unknown>) => void = () => {};
  const promise = new Promise<Record<string, unknown>>((r) => {
    resolve = r;
  });
  const b = (globalThis as any).browser;
  b.storage.sync.get.mockReturnValueOnce(promise);
  b.downloads.cancel = vi.fn().mockResolvedValue(undefined);
  b.downloads.removeFile = vi.fn().mockResolvedValue(undefined);
  b.downloads.erase = vi.fn().mockResolvedValue([]);
  return { resolve };
});

vi.mock("@/aria2-extension", () => ({
  captureTorrentFromURL: vi.fn(),
  captureURL: vi.fn().mockResolvedValue(undefined),
  isChromium: vi.fn().mockReturnValue(false),
  isFirefox: vi.fn().mockReturnValue(false),
  showNotification: vi.fn(),
}));

vi.mock("@/current-tab-provider", () => ({
  findCurrentTab: vi.fn().mockResolvedValue(undefined),
}));

const server = Server.create({ name: "Test" });
const storedOptions = ExtensionOptions.create({
  servers: { [server.uuid]: server },
  captureServer: server.uuid,
  captureDownloads: true,
});

describe("Options loading", () => {
  beforeEach(() => {
    vi.mocked(browser.storage.sync.get).mockResolvedValue({ options: ExtensionOptions.serialize(storedOptions) });
  });

  it("waits for the stored options before handling a download that woke up the background script", async () => {
    vi.mocked(isChromium).mockReturnValue(false);
    const downloadItem = { id: 1, filename: "/tmp/file.zip", url: "https://example.com/file.zip", totalBytes: 1000 } as Downloads.DownloadItem;

    const handled = listenerOnDownloadCreated(downloadItem);
    storage.resolve({ options: ExtensionOptions.serialize(storedOptions) });
    await handled;

    await vi.waitFor(() => expect(captureURL).toHaveBeenCalledOnce());
    expect(browser.downloads.cancel).toHaveBeenCalledWith(1);
  });

  it("captures downloads on Chromium even if they were created before the options were loaded", async () => {
    vi.mocked(isChromium).mockReturnValue(true);
    vi.mocked(captureURL).mockClear();
    const downloadItem = { id: 2, filename: "", url: "https://example.com/other.zip", totalBytes: 1000 } as Downloads.DownloadItem;

    await listenerOnDownloadCreated(downloadItem);
    await listenerOnDownloadChanged({ id: 2, filename: { previous: "", current: "/tmp/other.zip" } } as Downloads.OnChangedDownloadDeltaType);

    await vi.waitFor(() => expect(captureURL).toHaveBeenCalledOnce());
  });
});
