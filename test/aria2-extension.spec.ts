import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as aria2Ext from "@/aria2-extension";
import type Server from "@/models/server";
import browser from "./setupTests";

describe("isFirefox", () => {
  it("returns true if downloads.onDeterminingFilename is undefined", () => {
    expect(aria2Ext.isFirefox()).toBe(true);
  });

  it("returns false if downloads.onDeterminingFilename is defined", () => {
    browser.downloads.onDeterminingFilename = {};
    expect(aria2Ext.isFirefox()).toBe(false);
    browser.downloads.onDeterminingFilename = undefined;
  });
});

describe("encodeFileToBase64", () => {
  it("resolves with base64 string for valid file", async () => {
    const file = new Blob(["test"], { type: "text/plain" });
    Object.defineProperty(file, "name", { value: "test.txt" });
    const result = await aria2Ext.encodeFileToBase64(file);
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("rejects if FileReader fails", async () => {
    const file = new Blob(["test"]);
    const original = global.FileReader;
    global.FileReader = class {
      onerror: any;
      onloadend: any;
      abort() {}
      readAsDataURL() {
        this.onerror();
      }
    } as any;
    await expect(aria2Ext.encodeFileToBase64(file)).rejects.toThrow();
    global.FileReader = original;
  });

  it("rejects if result doesn't contain valid base64", async () => {
    const file = new Blob(["test"]);
    const original = global.FileReader;
    global.FileReader = class {
      onloadend: any;
      result = "invalid";
      abort() {}
      readAsDataURL() {
        setTimeout(() => this.onloadend(), 0);
      }
    } as any;
    await expect(aria2Ext.encodeFileToBase64(file)).rejects.toThrow("Cannot get base64");
    global.FileReader = original;
  });

  it("rejects if result is empty", async () => {
    const file = new Blob(["test"]);
    const original = global.FileReader;
    global.FileReader = class {
      onloadend: any;
      result = null;
      abort() {}
      readAsDataURL() {
        setTimeout(() => this.onloadend(), 0);
      }
    } as any;
    await expect(aria2Ext.encodeFileToBase64(file)).rejects.toThrow("Result is empty");
    global.FileReader = original;
  });
});

describe("showNotification", () => {
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
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
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
  const server = {
    rpcParameters: { key: "value" },
  } as unknown as Server;

  it("calls aria2.addTorrent for .torrent file", async () => {
    const aria2 = { call: vi.fn() };
    const file = new File(["data"], "file.torrent");
    Object.defineProperty(file, "name", { value: "file.torrent" });

    await aria2Ext.captureTorrentFromFile(aria2, server, file);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for non-torrent file", async () => {
    const aria2 = { call: vi.fn() };
    const file = new Blob(["data"]);
    Object.defineProperty(file, "name", { value: "file.meta4" });

    await aria2Ext.captureTorrentFromFile(aria2, server, file as any);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value" });
  });
});

describe("captureTorrentFromURL", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ blob: () => new Blob(["data"]) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls aria2.addTorrent for .torrent url", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;
    const aria2 = { call: vi.fn() };

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test.torrent");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addTorrent when filename ends with .torrent", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;
    const aria2 = { call: vi.fn() };

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test/download", undefined, "file.torrent");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for .meta4 url", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;
    const aria2 = { call: vi.fn() };

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test.meta4");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value" });
  });

  it("includes directory in parameters when provided", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;
    const aria2 = { call: vi.fn() };

    await aria2Ext.captureTorrentFromURL(aria2, server, "http://test.meta4", "/downloads");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value", dir: "/downloads" });
  });
});

describe("captureURL", () => {
  it("calls aria2.addUri for normal url", async () => {
    const server = { rpcParameters: { key: "value" } } as unknown as Server;
    const aria2 = { call: vi.fn() };

    await aria2Ext.captureURL(aria2, server, "http://test", "referer", "cookie", "/downloads", "output.mp4");

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
    const aria2 = { call: vi.fn() };

    await aria2Ext.captureURL(aria2, server, "http://test", "referer", "cookie");

    expect(aria2.call).toHaveBeenCalledWith(
      "aria2.addUri",
      ["http://test"],
      expect.objectContaining({
        header: ["Referer: referer", "Cookie: cookie"],
        key: "value",
      }),
    );

    expect(aria2.call.mock.calls[0][2]).not.toHaveProperty("dir");
    expect(aria2.call.mock.calls[0][2]).not.toHaveProperty("out");
  });
});
