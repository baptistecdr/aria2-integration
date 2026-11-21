import * as z from "zod/mini";
import { intFromString } from "@/domain/zod";

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
