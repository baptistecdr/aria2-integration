import type Aria2 from "@baptistecdr/aria2";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Downloads } from "webextension-polyfill";
import type { Connections } from "@/background/connections";
import { captureDownloadItem, createDownloadHandlers, downloadItemMustBeCaptured } from "@/background/downloads";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import { isChromium } from "@/platform/browser-info";
import { showNotification } from "@/platform/notifications";
import { captureTorrentFromURL, captureURL } from "@/services/capture";
import { fakeOptionsStore } from "../helpers/fake-options-store";
import browser from "../setupTests";

// A plain object is used instead of `vi.mockObject(new Aria2(...))`: auto-mocking a real Aria2 instance
// (which extends EventTarget) makes vitest's deep-equal assertions on it (toHaveBeenCalledWith) pathologically
// slow (seconds per assertion) once certain other modules are also loaded in the same test file.
function createMockAria2(): Aria2 {
  return { call: vi.fn(), multicall: vi.fn() } as unknown as Aria2;
}

vi.mock("@/services/capture", () => ({
  captureTorrentFromURL: vi.fn(),
  captureURL: vi.fn(),
}));

vi.mock("@/platform/browser-info", () => ({
  isChromium: vi.fn().mockReturnValue(false),
  isFirefox: vi.fn().mockReturnValue(true),
}));

vi.mock("@/platform/notifications", () => ({
  showNotification: vi.fn(),
}));

vi.mock("@/platform/tabs", () => ({
  findCurrentTab: vi.fn().mockResolvedValue({ url: "https://example.com/page", incognito: false }),
}));

describe("Capture Download Item", () => {
  function createDownloadItem(url: string, customize?: (di: Downloads.DownloadItem) => void) {
    const downloadItem = {
      bytesReceived: 0,
      canResume: false,
      danger: "file",
      exists: false,
      fileSize: 0,
      filename: "",
      id: 0,
      incognito: false,
      paused: false,
      startTime: "",
      state: "complete",
      totalBytes: 0,
      url: url,
    } as Downloads.DownloadItem;
    if (customize) {
      customize(downloadItem);
    }
    return downloadItem;
  }

  it("should not capture download item if there is no capture server", () => {
    const extensionOptions = ExtensionOptions.create();
    const downloadItem: Downloads.DownloadItem = createDownloadItem("https://example.com");

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, "");

    expect(captured).toBeFalsy();
  });

  it("should capture download item", () => {
    const extensionOptions = ExtensionOptions.create({ captureServer: "captureServer" });
    const downloadItem = createDownloadItem("https://example.com");

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, "");

    expect(captured).toBeTruthy();
  });

  it.each([
    {
      description: "should capture download item if its total bytes is unknown",
      totalBytes: -1,
      minFileSize: 123,
      expected: true,
    },
    {
      description: "should not capture download item if its total bytes is lower than min file size",
      totalBytes: 1,
      minFileSize: 123,
      expected: false,
    },
    {
      description: "should capture download item if its total bytes is greater than min file size",
      totalBytes: 256,
      minFileSize: 123,
      expected: true,
    },
  ])("$description", ({ totalBytes, minFileSize, expected }) => {
    const extensionOptions = ExtensionOptions.create({ captureServer: "captureServer", minFileSizeInBytes: minFileSize });

    const downloadItem = createDownloadItem("https://example.com", (di) => {
      di.totalBytes = totalBytes;
    });

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, "");

    expect(captured).toBe(expected);
  });

  it.each([
    {
      description: "should capture download item if its protocol is not excluded",
      url: "https://example.com",
      excludedProtocols: [],
      expected: true,
    },
    {
      description: "should not capture download item if its protocol is excluded",
      url: "ftp://example.com",
      excludedProtocols: ["ftp"],
      expected: false,
    },
  ])("$description", ({ url, excludedProtocols, expected }) => {
    const extensionOptions = ExtensionOptions.create({ captureServer: "captureServer", excludedProtocols });

    const downloadItem = createDownloadItem(url);

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, "");

    expect(captured).toBe(expected);
  });

  it.each([
    {
      description: "should capture download item if its hostname is not excluded",
      url: "https://example.com",
      referer: "",
      excludedSites: [],
      expected: true,
    },
    {
      description: "should not capture download item if its hostname is not excluded",
      url: "https://example.com",
      referer: "",
      excludedSites: ["example.com"],
      expected: false,
    },
    {
      description: "should not capture download item if its referer hostname is excluded",
      url: "https://example.com",
      referer: "https://referer.com",
      excludedSites: ["referer.com"],
      expected: false,
    },
  ])("$description", ({ url, referer, excludedSites, expected }) => {
    const extensionOptions = ExtensionOptions.create({ captureServer: "captureServer", excludedSites });

    const downloadItem = createDownloadItem(url);

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, referer);

    expect(captured).toBe(expected);
  });

  it.each([
    {
      description: "should capture download item if its file type is not excluded",
      url: "https://example.com/file.txt",
      referer: "",
      filename: "",
      excludedFileTypes: [],
      expected: true,
    },
    {
      description: "should not capture download item if its file type is not excluded",
      url: "https://example.com/file.txt",
      referer: "",
      filename: "",
      excludedFileTypes: ["txt"],
      expected: false,
    },
    {
      description: "should not capture download item if its referer file type is excluded",
      url: "https://example.com/download",
      referer: "https://referer.com/file.txt",
      filename: "",
      excludedFileTypes: ["txt"],
      expected: false,
    },
    {
      description: "should not capture download item if its filename file type is excluded",
      url: "https://example.com/download",
      referer: "",
      filename: "file.txt",
      excludedFileTypes: ["txt"],
      expected: false,
    },
    {
      description: "should treat file types literally instead of as regular expressions",
      url: "https://example.com/file.cpp",
      referer: "",
      filename: "",
      excludedFileTypes: ["c++", ".z.p"],
      expected: true,
    },
    {
      description: "should not capture download item if its file type contains regular expression characters",
      url: "https://example.com/file.c++",
      referer: "",
      filename: "",
      excludedFileTypes: ["c++"],
      expected: false,
    },
  ])("$description", ({ url, referer, filename, excludedFileTypes, expected }) => {
    const extensionOptions = ExtensionOptions.create({ captureServer: "captureServer", excludedFileTypes });

    const downloadItem = createDownloadItem(url, (di) => {
      di.filename = filename;
    });

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, referer);

    expect(captured).toBe(expected);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      description: "URL ends with .torrent",
      url: "https://example.com/file.torrent",
      filename: "file.torrent",
    },
    {
      description: "URL ends with .meta4",
      url: "https://example.com/file.meta4",
      filename: "file.meta4",
    },
    {
      description: "URL ends with .metalink",
      url: "https://example.com/file.metalink",
      filename: "file.metalink",
    },
    {
      description: "filename ends with .torrent",
      url: "https://example.com/file",
      filename: "file.torrent",
    },
    {
      description: "filename ends with .meta4",
      url: "https://example.com/file",
      filename: "file.meta4",
    },
    {
      description: "filename ends with .metalink",
      url: "https://example.com/file",
      filename: "file.metalink",
    },
  ])("should capture download item as torrent when $description", async ({ url, filename }) => {
    const aria2 = createMockAria2();
    const server = Server.create();
    const downloadItem = createDownloadItem(url, (di) => {
      di.filename = filename;
    });

    await captureDownloadItem(aria2, server, downloadItem, "", "", false, false);

    expect(captureTorrentFromURL).toHaveBeenCalledTimes(1);
    expect(captureTorrentFromURL).toHaveBeenCalledWith(aria2, server, url, false, undefined, filename);
    expect(captureURL).not.toHaveBeenCalled();
  });

  it("should capture download item as regular URL", async () => {
    const downloadItem = createDownloadItem("https://example.com/file.zip", (di) => {
      di.filename = "file.zip";
    });
    const aria2 = createMockAria2();
    const server = Server.create();

    await captureDownloadItem(aria2, server, downloadItem, "referer", "cookies", false, false);

    expect(captureURL).toHaveBeenCalledTimes(1);
    expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.zip", "referer", "cookies", false, undefined, "file.zip");
    expect(captureTorrentFromURL).not.toHaveBeenCalled();
  });

  it("should capture download item as torrent and use the complete file path", async () => {
    const downloadItem = createDownloadItem("https://example.com/file.torrent", (di) => {
      di.filename = "/path/to/file.torrent";
    });
    const aria2 = createMockAria2();
    const server = Server.create();

    await captureDownloadItem(aria2, server, downloadItem, "referer", "cookies", true, false);

    expect(captureTorrentFromURL).toHaveBeenCalledTimes(1);
    expect(captureTorrentFromURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.torrent", false, "/path/to", "file.torrent");
    expect(captureURL).not.toHaveBeenCalled();
  });

  it("should capture download item as regular URL and use the complete file path", async () => {
    const downloadItem = createDownloadItem("https://example.com/file.zip", (di) => {
      di.filename = "/path/to/file.zip";
    });
    const aria2 = createMockAria2();
    const server = Server.create();

    await captureDownloadItem(aria2, server, downloadItem, "referer", "cookies", true, false);

    expect(captureURL).toHaveBeenCalledTimes(1);
    expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.zip", "referer", "cookies", false, "/path/to", "file.zip");
    expect(captureTorrentFromURL).not.toHaveBeenCalled();
  });
});

describe("Download handlers", () => {
  const SERVER_UUID = "6f1c7a3e-2b4d-4e8f-9a1b-3c5d7e9f1a2b";
  const server = Server.create({ uuid: SERVER_UUID, name: "aria2" });
  const aria2 = { call: vi.fn(), multicall: vi.fn() } as unknown as Aria2;
  const connections: Connections = { get: (id) => (id === SERVER_UUID ? aria2 : undefined), all: () => [[server, aria2]] };
  const captureOptions = { servers: { [SERVER_UUID]: server }, captureDownloads: true, captureServer: SERVER_UUID };
  const downloadItem = (overrides: Partial<Downloads.DownloadItem> = {}) =>
    ({ id: 1, filename: "/downloads/file.bin", url: "https://example.com/file.bin", totalBytes: 1024, ...overrides }) as Downloads.DownloadItem;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isChromium).mockReturnValue(false);
    vi.mocked(captureURL).mockResolvedValue(undefined);
    browser.downloads.cancel = vi.fn().mockResolvedValue(undefined);
    browser.downloads.removeFile = vi.fn().mockResolvedValue(undefined);
    browser.downloads.erase = vi.fn().mockResolvedValue([]);
  });

  describe("on Firefox", () => {
    it("should cancel the browser download and send it to aria2", async () => {
      const handlers = createDownloadHandlers({ store: fakeOptionsStore(captureOptions), connections });

      await handlers.onCreated(downloadItem());

      expect(browser.downloads.cancel).toHaveBeenCalledWith(1);
      expect(browser.downloads.erase).toHaveBeenCalledWith({ id: 1 });
      expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.bin", "https://example.com/page", "", false, undefined, "file.bin");
      expect(showNotification).toHaveBeenCalledWith("Translated: addFileSuccess");
    });

    it("should not capture the download when capture downloads is disabled", async () => {
      const handlers = createDownloadHandlers({ store: fakeOptionsStore({ ...captureOptions, captureDownloads: false }), connections });

      await expect(handlers.onCreated(downloadItem())).resolves.toBeUndefined();

      expect(browser.downloads.cancel).not.toHaveBeenCalled();
      expect(captureURL).not.toHaveBeenCalled();
    });

    it("should let the browser download excluded files", async () => {
      const handlers = createDownloadHandlers({ store: fakeOptionsStore({ ...captureOptions, excludedFileTypes: ["bin"] }), connections });

      await handlers.onCreated(downloadItem());

      expect(browser.downloads.cancel).not.toHaveBeenCalled();
      expect(captureURL).not.toHaveBeenCalled();
    });

    it("should notify the error when aria2 rejects the download", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(captureURL).mockRejectedValueOnce(new Error("aria2 is down"));
      const handlers = createDownloadHandlers({ store: fakeOptionsStore(captureOptions), connections });

      await expect(handlers.onCreated(downloadItem())).resolves.toBeUndefined();

      expect(showNotification).toHaveBeenCalledWith("Translated: addFileError");
    });

    it("should still send the download to aria2 when the browser download cannot be cancelled", async () => {
      browser.downloads.cancel = vi.fn().mockRejectedValue(new Error("already complete"));
      const handlers = createDownloadHandlers({ store: fakeOptionsStore(captureOptions), connections });

      await handlers.onCreated(downloadItem());

      expect(browser.downloads.removeFile).toHaveBeenCalledWith(1);
      expect(browser.downloads.erase).toHaveBeenCalledWith({ id: 1 });
      expect(captureURL).toHaveBeenCalled();
    });
  });

  describe("on Chromium", () => {
    beforeEach(() => {
      vi.mocked(isChromium).mockReturnValue(true);
    });

    it("should wait for the filename before sending the download to aria2", async () => {
      const handlers = createDownloadHandlers({ store: fakeOptionsStore(captureOptions), connections });

      await handlers.onCreated(downloadItem({ filename: "" }));
      expect(captureURL).not.toHaveBeenCalled();

      await handlers.onChanged({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });
      expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.bin", "https://example.com/page", "", false, undefined, "file.bin");
    });

    it("should not throw when the download item is not tracked", async () => {
      // browser.downloads.onChanged fires for every download, including the ones created before the background started.
      const handlers = createDownloadHandlers({ store: fakeOptionsStore(captureOptions), connections });

      await expect(handlers.onChanged({ id: 123456 } as Downloads.OnChangedDownloadDeltaType)).resolves.toBeUndefined();
    });

    it("should forget downloads that end without getting a filename", async () => {
      const handlers = createDownloadHandlers({ store: fakeOptionsStore(captureOptions), connections });

      await handlers.onCreated(downloadItem({ filename: "" }));
      await handlers.onChanged({ id: 1, state: { previous: "in_progress", current: "interrupted" } });
      await handlers.onChanged({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });

      expect(captureURL).not.toHaveBeenCalled();
    });
  });
});
