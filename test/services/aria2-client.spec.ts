import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAria2Client } from "@/services/aria2-client";

const rawTask = (gid: string, status: string) => ({
  gid,
  status,
  completedLength: "0",
  connections: "1",
  downloadSpeed: "0",
  totalLength: "100",
  uploadLength: "0",
  uploadSpeed: "0",
  dir: "/downloads",
  files: [{ completedLength: "0", length: "100", path: "/downloads/file", uris: [{ uri: "https://example.com/file" }] }],
});

describe("Aria2Client", () => {
  const rpc = { call: vi.fn(), multicall: vi.fn() };
  const client = createAria2Client({}, rpc);

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.call.mockResolvedValue("OK");
  });

  it.each([
    ["addUri", () => client.addUri(["https://example.com/file"], { dir: "/tmp" }), ["aria2.addUri", ["https://example.com/file"], { dir: "/tmp" }]],
    ["addTorrent", () => client.addTorrent("ZGF0YQ==", { dir: "/tmp" }), ["aria2.addTorrent", "ZGF0YQ==", [], { dir: "/tmp" }]],
    ["addMetalink", () => client.addMetalink("ZGF0YQ==", {}), ["aria2.addMetalink", "ZGF0YQ==", [], {}]],
    ["pause", () => client.pause("gid"), ["aria2.pause", "gid"]],
    ["unpause", () => client.unpause("gid"), ["aria2.unpause", "gid"]],
    ["remove", () => client.remove("gid"), ["aria2.remove", "gid"]],
    ["removeDownloadResult", () => client.removeDownloadResult("gid"), ["aria2.removeDownloadResult", "gid"]],
    ["purgeDownloadResult", () => client.purgeDownloadResult(), ["aria2.purgeDownloadResult"]],
  ])("%s calls the matching RPC method", async (_, action, expectedCall) => {
    await action();

    expect(rpc.call).toHaveBeenCalledWith(...expectedCall);
  });

  it("parses the global statistics", async () => {
    rpc.call.mockResolvedValue({ downloadSpeed: "10", uploadSpeed: "20", numActive: "1", numWaiting: "2", numStopped: "3", numStoppedTotal: "4" });

    await expect(client.getGlobalStat()).resolves.toEqual({
      downloadSpeed: 10,
      uploadSpeed: 20,
      numActive: 1,
      numWaiting: 2,
      numStopped: 3,
      numStoppedTotal: 4,
    });
    expect(rpc.call).toHaveBeenCalledWith("getGlobalStat", [], {});
  });

  it("gets the active, waiting and stopped tasks in one call", async () => {
    rpc.multicall.mockResolvedValue([[rawTask("1", "active")], [rawTask("2", "waiting")], [rawTask("3", "complete")]]);

    const tasks = await client.getTasks(5, 10);

    expect(rpc.multicall).toHaveBeenCalledWith([["tellActive"], ["tellWaiting", 0, 5], ["tellStopped", 0, 10]]);
    expect(tasks.map((task) => task.gid)).toEqual(["1", "2", "3"]);
    expect(tasks[0].totalLength).toBe(100);
  });

  it("skips the groups that aria2 could not return", async () => {
    rpc.multicall.mockResolvedValue([[rawTask("1", "active")], { code: 1, message: "error" }, []]);

    const tasks = await client.getTasks(5, 10);

    expect(tasks.map((task) => task.gid)).toEqual(["1"]);
  });
});
