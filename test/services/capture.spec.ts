import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "@/domain/server";
import { createAria2Client } from "@/services/aria2-client";
import * as capture from "@/services/capture";

const rpc = { call: vi.fn(), multicall: vi.fn() };
const aria2 = createAria2Client({}, rpc);

describe("captureTorrentFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const server = {
    rpcParameters: { key: "value" },
    incognitoModeOptions: { overwriteRpcParameters: false },
  } as unknown as Server;

  it("calls aria2.addTorrent for .torrent file", async () => {
    const file = new File(["data"], "file.torrent");
    Object.defineProperty(file, "name", { value: "file.torrent" });

    await capture.captureTorrentFile(aria2, server, file, false);

    expect(rpc.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for non-torrent file", async () => {
    const file = new Blob(["data"]);
    Object.defineProperty(file, "name", { value: "file.meta4" });

    await capture.captureTorrentFile(aria2, server, file as any, false);

    expect(rpc.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value" });
  });
});

describe("captureTorrentFromUrl", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ blob: () => new Blob(["data"]) });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls aria2.addTorrent for .torrent url", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromUrl(aria2, server, { url: "http://test.torrent", incognito: false });

    expect(rpc.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addTorrent when filename ends with .torrent", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromUrl(aria2, server, { url: "http://test/download", incognito: false, filename: "file.torrent" });

    expect(rpc.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for .meta4 url", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromUrl(aria2, server, { url: "http://test.meta4", incognito: false });

    expect(rpc.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value" });
  });

  it("includes directory in parameters when provided", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromUrl(aria2, server, { url: "http://test.meta4", incognito: false, directory: "/downloads" });

    expect(rpc.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value", dir: "/downloads" });
  });
});

describe("captureUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls aria2.addUri for normal url", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureUrl(aria2, server, {
      url: "http://test",
      referer: "referer",
      cookies: "cookie",
      incognito: false,
      directory: "/downloads",
      filename: "output.mp4",
    });

    expect(rpc.call).toHaveBeenCalledWith(
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
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureUrl(aria2, server, { url: "http://test", referer: "referer", cookies: "cookie", incognito: false });

    expect(rpc.call).toHaveBeenCalledWith(
      "aria2.addUri",
      ["http://test"],
      expect.objectContaining({
        header: ["Referer: referer", "Cookie: cookie"],
        key: "value",
      }),
    );

    expect(vi.mocked(rpc.call).mock.calls[0][2]).not.toHaveProperty("dir");
    expect(vi.mocked(rpc.call).mock.calls[0][2]).not.toHaveProperty("out");
  });
});

describe("captureUrl with torrents", () => {
  const originalFetch = global.fetch;
  const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ blob: () => new Blob(["data"]) });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each([
    { description: "the URL is a torrent", url: "http://test/file.torrent", filename: undefined, method: "aria2.addTorrent" },
    { description: "the filename is a torrent", url: "http://test/download", filename: "file.torrent", method: "aria2.addTorrent" },
    { description: "the URL is a metalink", url: "http://test/file.metalink", filename: undefined, method: "aria2.addMetalink" },
  ])("adds the file content when $description", async ({ url, filename, method }) => {
    await capture.captureUrl(aria2, server, { url, filename, incognito: false });

    expect(global.fetch).toHaveBeenCalledWith(url);
    expect(rpc.call).toHaveBeenCalledWith(method, "ZGF0YQ==", [], { key: "value" });
  });

  it("sends empty referer and cookie headers when none is given", async () => {
    await capture.captureUrl(aria2, server, { url: "http://test/file.zip", incognito: false });

    expect(rpc.call).toHaveBeenCalledWith("aria2.addUri", ["http://test/file.zip"], { header: ["Referer: ", "Cookie: "], key: "value" });
  });
});

describe("serverParameters", () => {
  const server = {
    rpcParameters: { split: "5" },
    incognitoModeOptions: { overwriteRpcParameters: true, rpcParameters: { split: "1" } },
  } as unknown as Server;

  it("uses the server parameters outside private windows", () => {
    expect(capture.serverParameters(server, false)).toEqual({ split: "5" });
  });

  it("uses the private window parameters when the server overwrites them", () => {
    expect(capture.serverParameters(server, true)).toEqual({ split: "1" });
  });

  it("uses the server parameters in private windows when the server does not overwrite them", () => {
    const notOverwriting = { ...server, incognitoModeOptions: { ...server.incognitoModeOptions, overwriteRpcParameters: false } } as Server;

    expect(capture.serverParameters(notOverwriting, true)).toEqual({ split: "5" });
  });

  it("returns a copy that can be changed safely", () => {
    capture.serverParameters(server, false).dir = "/tmp";

    expect(server.rpcParameters).toEqual({ split: "5" });
  });
});
