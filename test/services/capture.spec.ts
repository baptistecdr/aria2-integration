import Aria2 from "@baptistecdr/aria2";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "@/domain/server";
import * as capture from "@/services/capture";

const aria2Call = vi.fn();

vi.mock("@baptistecdr/aria2", () => ({
  default: vi.fn(function (this: Aria2) {
    this.call = aria2Call;
    this.multicall = vi.fn();
  }),
}));

const aria2 = new Aria2({});

describe("captureTorrentFromFile", () => {
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

    await capture.captureTorrentFromFile(aria2, server, file, false);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for non-torrent file", async () => {
    const file = new Blob(["data"]);
    Object.defineProperty(file, "name", { value: "file.meta4" });

    await capture.captureTorrentFromFile(aria2, server, file as any, false);

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
  });

  it("calls aria2.addTorrent for .torrent url", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromURL(aria2, server, "http://test.torrent", false);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addTorrent when filename ends with .torrent", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromURL(aria2, server, "http://test/download", false, undefined, "file.torrent");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addTorrent", "ZGF0YQ==", [], { key: "value" });
  });

  it("calls aria2.addMetalink for .meta4 url", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromURL(aria2, server, "http://test.meta4", false);

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value" });
  });

  it("includes directory in parameters when provided", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureTorrentFromURL(aria2, server, "http://test.meta4", false, "/downloads");

    expect(aria2.call).toHaveBeenCalledWith("aria2.addMetalink", "ZGF0YQ==", [], { key: "value", dir: "/downloads" });
  });
});

describe("captureURL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls aria2.addUri for normal url", async () => {
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureURL(aria2, server, "http://test", "referer", "cookie", false, "/downloads", "output.mp4");

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
    const server = { rpcParameters: { key: "value" }, incognitoModeOptions: { overwriteRpcParameters: false } } as unknown as Server;

    await capture.captureURL(aria2, server, "http://test", "referer", "cookie", false);

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
