import { describe, expect, it } from "vitest";
import { type DownloadCandidate, isTorrentLike, shouldCaptureDownload } from "@/domain/capture-rules";
import { ExtensionOptions } from "@/domain/extension-options";

describe("shouldCaptureDownload", () => {
  function createDownloadItem(url: string, customize?: (download: DownloadCandidate) => void) {
    const download: DownloadCandidate = { url, filename: "", totalBytes: 0 };
    customize?.(download);
    return download;
  }

  it("should not capture download item if capture downloads is disabled", () => {
    const extensionOptions = ExtensionOptions.create({ captureServer: "captureServer" });

    expect(shouldCaptureDownload(extensionOptions, createDownloadItem("https://example.com"), "")).toBe(false);
  });

  it("should not capture download item if there is no capture server", () => {
    const extensionOptions = ExtensionOptions.create();
    const downloadItem = createDownloadItem("https://example.com");

    const captured = shouldCaptureDownload(extensionOptions, downloadItem, "");

    expect(captured).toBeFalsy();
  });

  it("should capture download item", () => {
    const extensionOptions = ExtensionOptions.create({ captureDownloads: true, captureServer: "captureServer" });
    const downloadItem = createDownloadItem("https://example.com");

    const captured = shouldCaptureDownload(extensionOptions, downloadItem, "");

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
    const extensionOptions = ExtensionOptions.create({ captureDownloads: true, captureServer: "captureServer", minFileSizeInBytes: minFileSize });

    const downloadItem = createDownloadItem("https://example.com", (download) => {
      download.totalBytes = totalBytes;
    });

    const captured = shouldCaptureDownload(extensionOptions, downloadItem, "");

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
    const extensionOptions = ExtensionOptions.create({ captureDownloads: true, captureServer: "captureServer", excludedProtocols });

    const downloadItem = createDownloadItem(url);

    const captured = shouldCaptureDownload(extensionOptions, downloadItem, "");

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
    const extensionOptions = ExtensionOptions.create({ captureDownloads: true, captureServer: "captureServer", excludedSites });

    const downloadItem = createDownloadItem(url);

    const captured = shouldCaptureDownload(extensionOptions, downloadItem, referer);

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
    const extensionOptions = ExtensionOptions.create({ captureDownloads: true, captureServer: "captureServer", excludedFileTypes });

    const downloadItem = createDownloadItem(url, (download) => {
      download.filename = filename;
    });

    const captured = shouldCaptureDownload(extensionOptions, downloadItem, referer);

    expect(captured).toBe(expected);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });
});

describe("isTorrentLike", () => {
  it.each(["file.torrent", "https://example.com/file.meta4", "file.metalink"])("should be true for %s", (name) => {
    expect(isTorrentLike(name)).toBe(true);
  });

  it.each(["file.zip", "file.torrent.zip", "", undefined])("should be false for %s", (name) => {
    expect(isTorrentLike(name)).toBe(false);
  });
});
