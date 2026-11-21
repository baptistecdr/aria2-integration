import Aria2 from "@baptistecdr/aria2";
import { GlobalStat } from "@/domain/global-stat";
import type { Server } from "@/domain/server";
import { Task } from "@/domain/task";

// Options of aria2's addUri, addTorrent and addMetalink methods.
export type Aria2Parameters = Record<string, string | string[]>;

// The aria2 RPC methods used by the extension, with typed results. See https://aria2.github.io/manual/en/html/aria2c.html#methods
export interface Aria2Client {
  addUri(uris: string[], parameters: Aria2Parameters): Promise<unknown>;
  addTorrent(base64: string, parameters: Aria2Parameters): Promise<unknown>;
  addMetalink(base64: string, parameters: Aria2Parameters): Promise<unknown>;
  pause(gid: string): Promise<unknown>;
  unpause(gid: string): Promise<unknown>;
  // Stops an active or waiting download.
  remove(gid: string): Promise<unknown>;
  // Forgets a finished, failed or removed download.
  removeDownloadResult(gid: string): Promise<unknown>;
  // Forgets every finished, failed or removed download.
  purgeDownloadResult(): Promise<unknown>;
  getGlobalStat(): Promise<GlobalStat>;
  // The active, waiting and stopped downloads, in that order.
  getTasks(numWaiting: number, numStopped: number): Promise<Task[]>;
}

export function createAria2Client(server: Partial<Server>, rpc: Pick<Aria2, "call" | "multicall"> = new Aria2(server)): Aria2Client {
  return {
    addUri: (uris, parameters) => rpc.call("aria2.addUri", uris, parameters),
    addTorrent: (base64, parameters) => rpc.call("aria2.addTorrent", base64, [], parameters),
    addMetalink: (base64, parameters) => rpc.call("aria2.addMetalink", base64, [], parameters),
    pause: (gid) => rpc.call("aria2.pause", gid),
    unpause: (gid) => rpc.call("aria2.unpause", gid),
    remove: (gid) => rpc.call("aria2.remove", gid),
    removeDownloadResult: (gid) => rpc.call("aria2.removeDownloadResult", gid),
    purgeDownloadResult: () => rpc.call("aria2.purgeDownloadResult"),
    getGlobalStat: async () => GlobalStat.parse(await rpc.call("getGlobalStat", [], {})),
    async getTasks(numWaiting, numStopped) {
      const groups: unknown[] = await rpc.multicall([["tellActive"], ["tellWaiting", 0, numWaiting], ["tellStopped", 0, numStopped]]);
      // A group is an error object instead of a list when its call failed.
      return Task.parseMany(groups.flatMap((tasks) => (Array.isArray(tasks) ? tasks : [])));
    },
  };
}
