import type Aria2 from "@baptistecdr/aria2";
import * as z from "zod/mini";
import { intFromString } from "@/models/zod";

const GlobalStatSchema = z.object({
  downloadSpeed: intFromString,
  uploadSpeed: intFromString,
  numActive: intFromString,
  numWaiting: intFromString,
  numStopped: intFromString,
  numStoppedTotal: intFromString,
});

export type GlobalStat = z.infer<typeof GlobalStatSchema>;

const DEFAULT_GLOBAL_STAT: GlobalStat = {
  downloadSpeed: 0,
  uploadSpeed: 0,
  numActive: 0,
  numWaiting: 0,
  numStopped: 0,
  numStoppedTotal: 0,
};

export function parseGlobalStat(data: unknown): GlobalStat {
  return GlobalStatSchema.parse(data);
}

export function defaultGlobalStat(): GlobalStat {
  return { ...DEFAULT_GLOBAL_STAT };
}

export async function getGlobalStat(aria2server: Aria2): Promise<GlobalStat> {
  const globalStat = await aria2server.call("getGlobalStat", [], {});
  return parseGlobalStat(globalStat);
}
