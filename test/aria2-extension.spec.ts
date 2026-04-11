import Aria2 from "@baptistecdr/aria2";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as aria2Ext from "@/aria2-extension";
import type Server from "@/models/server";
import browser from "./setupTests";

const aria2Call = vi.fn();

vi.mock("@baptistecdr/aria2", () => ({
  default: vi.fn(function (this: Aria2) {
    this.call = aria2Call;
    this.multicall = vi.fn();
  }),
}));

const aria2 = new Aria2();

describe("isFirefox", () => {
  afterEach(() => {
    browser.downloads.onDeterminingFilename = undefined;
  });

  it("returns true if downloads.onDeterminingFilename is undefined", () => {
    expect(aria2Ext.isFirefox()).toBe(true);
  });

  it("returns false if downloads.onDeterminingFilename is defined", () => {
    browser.downloads.onDeterminingFilename = {};
    expect(aria2Ext.isFirefox()).toBe(false);
  });
});

describe("encodeFileToBase64", () => {
  const originalFileReader = global.FileReader;

  afterEach(() => {
    global.FileReader = originalFileReader;
  });

  it("resolves with base64 string for valid file", async () => {
    const file = new Blob(["test"], { type: "text/plain" });
    Object.defineProperty(file, "name", { value: "test.txt" });
    const result = await aria2Ext.encodeFileToBase64(file);
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("rejects if FileReader fails", async () => {
    const file = new Blob(["test"]);
    global.FileReader = class {
      onerror: any;
      onloadend: any;
      abort() {}
      readAsDataURL() {
        this.onerror();
      }
    } as any;

    await expect(aria2Ext.encodeFileToBase64(file)).rejects.toThrow();
  });

  it("rejects if result doesn't contain valid base64", async () => {
    const file = new Blob(["test"]);
    global.FileReader = class {
      onloadend: any;
      result = "invalid";
      abort() {}
      readAsDataURL() {
        setTimeout(() => this.onloadend(), 0);
      }
    } as any;

    await expect(aria2Ext.encodeFileToBase64(file)).rejects.toThrow("Cannot get base64 encoded string");
  });

  it("rejects if result is empty", async () => {
    const file = new Blob(["test"]);
    global.FileReader = class {
      onloadend: any;
      result = null;
      abort() {}
      readAsDataURL() {
        setTimeout(() => this.onloadend(), 0);
      }
    } as any;

    await expect(aria2Ext.encodeFileToBase64(file)).rejects.toThrow("Result is empty");
  });
});

describe("showNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls browser.notifications.create with correct options", async () => {
    await aria2Ext.showNotification("Test message");
    expect(browser.notifications.create).toHaveBeenCalledWith(undefined, {
      type: "basic",
      title: "Aria2",
      iconUrl: "../icons/icon-browser-80.png",
      message: "Test message",
    });
  });
});

describe("download", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches and returns a blob", async () => {
    const blob = new Blob(["data"]);
    global.fetch = vi.fn().mockResolvedValue({ blob: () => blob });
    const result = await aria2Ext.download("http://test");
    expect(global.fetch).toHaveBeenCalledWith("http://test");
    expect(result).toBe(blob);
  });

  it("throws error if fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(aria2Ext.download("http://test")).rejects.toThrow("Network error");
  });
});

describe("captureTorrentFromFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const server = {
    rpcParameters: { key: "value" },
  } as unknown as Server;

  it("calls aria2.addTorrent for .torrent file", async () => {
    const file = new File(["data"], "file.torrent");
    Object.defineProperty(file, "name", { value: "file.torrent" });

    await aria2Ext.captureTorrentFromFile(aria2, server, file);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for non-torrent file", async () => {
    const file = new Blob(["data"]);
    Object.defineProperty(file, "name", { value: "file.meta4" });

    await aria2Ext.captureTorrentFromFile(aria2, server, file as any);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value" });
  });
});

describe("captureTorrentFromURL", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ blob: () => new Blob(["data"]) });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("calls aria2.addTorrent for .torrent url", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test.torrent", false);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addTorrent when filename ends with .torrent", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test/download", false, undefined, "file.torrent");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for .meta4 url", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test.meta4", false);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value" });
  });

  it("includes directory in parameters when provided", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test.meta4", false, "/downloads");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value", dir: "/downloads" });
  });
});

describe("captureURL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls aria2.addUri for normal url", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;

    await aria2Ext.captureURL(aria2, server, "http://test", "referer", "cookie", false, "/downloads", "output.mp4");

    expect(aria2.call).toHaveBeenCalledWith(
      "aria2.addUri",
      ["http://test"],
      expect.objectContaining({
        header: ["Referer: referer", "Cookie: cookie"],
        dir: "/downloads",
        out: "output.mp4",
        key: "value",
      }),
    );
  });

  it("calls aria2.addUri without directory or filename if not provided", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;

    await aria2Ext.captureURL(aria2, server, "http://test", "referer", "cookie", false);

    expect(aria2.call).toHaveBeenCalledWith(
      "aria2.addUri",
      ["http://test"],
      expect.objectContaining({
        header: ["Referer: referer", "Cookie: cookie"],
        key: "value",
      }),
    );

    expect(vi.mocked(aria2.call).mock.calls[0][2]).not.toHaveProperty("dir");
    expect(vi.mocked(aria2.call).mock.calls[0][2]).not.toHaveProperty("out");
  });
});
