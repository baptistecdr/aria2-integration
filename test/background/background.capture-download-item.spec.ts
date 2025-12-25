// @ts-expect-error No types available
import Aria2 from "@baptistecdr/aria2";
import { expect, vi } from "vitest";
import type { Downloads } from "webextension-polyfill";
import { captureTorrentFromURL, captureURL } from "@/aria2-extension";
import { captureDownloadItem, downloadItemMustBeCaptured } from "@/background/background";
import ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";

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
    const extensionOptions = new ExtensionOptions();
    const downloadItem: Downloads.DownloadItem = createDownloadItem("https://example.com");

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, "");

    expect(captured).toBeFalsy();
  });

  it("should capture download item", () => {
    const extensionOptions = new ExtensionOptions({}, "captureServer");
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
    const extensionOptions = vi.mockObject(new ExtensionOptions());
    vi.spyOn(extensionOptions, "captureServer", "get").mockReturnValue("captureServer");
    vi.spyOn(extensionOptions, "minFileSizeInBytes", "get").mockReturnValue(minFileSize);

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
    const extensionOptions = vi.mockObject(new ExtensionOptions());
    vi.spyOn(extensionOptions, "captureServer", "get").mockReturnValue("captureServer");
    vi.spyOn(extensionOptions, "excludedProtocols", "get").mockReturnValue(vi.mocked(excludedProtocols));

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
    const extensionOptions = vi.mockObject(new ExtensionOptions());
    vi.spyOn(extensionOptions, "captureServer", "get").mockReturnValue("captureServer");
    vi.spyOn(extensionOptions, "excludedSites", "get").mockReturnValue(vi.mocked(excludedSites));

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
  ])("$description", ({ url, referer, filename, excludedFileTypes, expected }) => {
    const extensionOptions = vi.mockObject(new ExtensionOptions());
    vi.spyOn(extensionOptions, "captureServer", "get").mockReturnValue("captureServer");
    vi.spyOn(extensionOptions, "excludedFileTypes", "get").mockReturnValue(vi.mocked(excludedFileTypes));

    const downloadItem = createDownloadItem(url, (di) => {
      di.filename = filename;
    });

    const captured = downloadItemMustBeCaptured(extensionOptions, downloadItem, referer);

    expect(captured).toBe(expected);
  });

  vi.mock("@/aria2-extension", () => ({
    captureTorrentFromURL: vi.fn(),
    captureURL: vi.fn(),
    isChromium: vi.fn().mockReturnValue(false),
  }));

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
    const aria2 = vi.mockObject(new Aria2());
    const server = vi.mockObject(new Server());
    const downloadItem = createDownloadItem(url, (di) => {
      di.filename = filename;
    });

    await captureDownloadItem(aria2, server, downloadItem, "", "", false);

    expect(captureTorrentFromURL).toHaveBeenCalledTimes(1);
    expect(captureTorrentFromURL).toHaveBeenCalledWith(aria2, server, url, undefined, filename);
    expect(captureURL).not.toHaveBeenCalled();
  });

  it("should capture download item as regular URL", async () => {
    const downloadItem = createDownloadItem("https://example.com/file.zip", (di) => {
      di.filename = "file.zip";
    });
    const aria2 = vi.mockObject(new Aria2());
    const server = vi.mockObject(new Server());

    await captureDownloadItem(aria2, server, downloadItem, "referer", "cookies", false);

    expect(captureURL).toHaveBeenCalledTimes(1);
    expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.zip", "referer", "cookies", undefined, "file.zip");
    expect(captureTorrentFromURL).not.toHaveBeenCalled();
  });

  it("should capture download item as torrent and use the complete file path", async () => {
    const downloadItem = createDownloadItem("https://example.com/file.torrent", (di) => {
      di.filename = "/path/to/file.torrent";
    });
    const aria2 = vi.mockObject(new Aria2());
    const server = vi.mockObject(new Server());

    await captureDownloadItem(aria2, server, downloadItem, "referer", "cookies", true);

    expect(captureTorrentFromURL).toHaveBeenCalledTimes(1);
    expect(captureTorrentFromURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.torrent", "/path/to", "file.torrent");
    expect(captureURL).not.toHaveBeenCalled();
  });

  it("should capture download item as regular URL and use the complete file path", async () => {
    const downloadItem = createDownloadItem("https://example.com/file.zip", (di) => {
      di.filename = "/path/to/file.zip";
    });
    const aria2 = vi.mockObject(new Aria2());
    const server = vi.mockObject(new Server());

    await captureDownloadItem(aria2, server, downloadItem, "referer", "cookies", true);

    expect(captureURL).toHaveBeenCalledTimes(1);
    expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://example.com/file.zip", "referer", "cookies", "/path/to", "file.zip");
    expect(captureTorrentFromURL).not.toHaveBeenCalled();
  });
});
