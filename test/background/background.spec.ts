// @ts-expect-error No types available
import Aria2 from "@baptistecdr/aria2";
import { expect, vi } from "vitest";
import browser, { type Cookies, type Downloads, type Menus } from "webextension-polyfill";
import {
  CONTEXT_MENUS_PARENT_ID,
  captureDownloadItem,
  createConnections,
  createContextMenus,
  downloadItemMustBeCaptured,
  formatCookies,
  getSelectedUrls,
} from "@/background/background.ts";
import { captureTorrentFromURL, captureURL } from "@/models/aria2-extension.ts";
import ExtensionOptions from "@/models/extension-options.ts";
import Server from "@/models/server.ts";

describe("Create Connections", () => {
  it("should create one connection per server", () => {
    const extensionOptions = new ExtensionOptions({
      server1: new Server(),
      server2: new Server(),
    });

    const result = createConnections(extensionOptions);

    expect(Object.keys(result)).toEqual(["server1", "server2"]);
    expect(result.server1).toBeInstanceOf(Aria2);
    expect(result.server2).toBeInstanceOf(Aria2);
  });
});

describe("Create Context Menus", () => {
  beforeEach(() => {
    browser.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    browser.contextMenus.create = vi.fn().mockResolvedValue(undefined);
  });

  it("should create a single server menu if only one server exists", async () => {
    const extensionOptions = new ExtensionOptions({
      server1: new Server(),
    });

    await createContextMenus(extensionOptions);

    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Translated: contextMenusTitle",
      id: "server1",
      contexts: ["link", "selection"],
    });
  });

  it("should create parent and child menus if multiple servers exist", async () => {
    const extensionOptions = new ExtensionOptions({
      server1: new Server("1", "Server 1"),
      server2: new Server("2", "Server 2"),
    });

    await createContextMenus(extensionOptions);

    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledTimes(3); // Parent + 2 servers
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Translated: contextMenusTitle",
      id: CONTEXT_MENUS_PARENT_ID,
      contexts: ["link", "selection"],
    });
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Server 1",
      parentId: CONTEXT_MENUS_PARENT_ID,
      id: "server1",
      contexts: ["link", "selection"],
    });
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Server 2",
      parentId: CONTEXT_MENUS_PARENT_ID,
      id: "server2",
      contexts: ["link", "selection"],
    });
  });

  it("should not create any menus if no servers exist", async () => {
    const extensionOptions = new ExtensionOptions();

    await createContextMenus(extensionOptions);

    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).not.toHaveBeenCalled();
  });
});

describe("Cookies", () => {
  function createCookie(name: string, value: string): Cookies.Cookie {
    return {
      domain: "domain",
      firstPartyDomain: "firstPartyDomain",
      hostOnly: false,
      httpOnly: false,
      path: "path",
      sameSite: "strict",
      secure: false,
      session: false,
      storeId: "storeId",
      name: name,
      value: value,
    };
  }

  it("should format cookies", () => {
    const cookies = [createCookie("name1", "value1"), createCookie("name2", "value2")];

    const formattedCookies = formatCookies(cookies);

    expect(formattedCookies).toEqual("name1=value1;name2=value2;");
  });
});

describe("Selected URLs", () => {
  it("should return the link URL if filled", () => {
    const onClickData: Menus.OnClickData = {
      editable: false,
      menuItemId: 0,
      modifiers: [],
      linkUrl: "linkUrl",
      selectionText: "selectionText",
    };

    const selectedUrls = getSelectedUrls(onClickData);

    expect(selectedUrls).toEqual(["linkUrl"]);
  });
  it("should parse the selection text if link URL is not provided", () => {
    const onClickData: Menus.OnClickData = {
      editable: false,
      menuItemId: 0,
      modifiers: [],
      selectionText: "selectionText1\n\nselectionText2 selectionText3",
    };

    const selectedUrls = getSelectedUrls(onClickData);

    expect(selectedUrls).toEqual(["selectionText1", "selectionText2", "selectionText3"]);
  });

  it("should return empty array if link URL and selection text is not provided", () => {
    const onClickData: Menus.OnClickData = {
      editable: false,
      menuItemId: 0,
      modifiers: [],
    };

    const selectedUrls = getSelectedUrls(onClickData);

    expect(selectedUrls).toEqual([]);
  });
});

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

  vi.mock("@/models/aria2-extension", () => ({
    captureTorrentFromURL: vi.fn(),
    captureURL: vi.fn(),
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
