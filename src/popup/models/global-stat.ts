import * as z from "zod/mini";

const parseIntStr = z.pipe(
  z.string(),
  z.transform((v) => Number.parseInt(v, 10)),
);

const GlobalStatSchema = z.object({
  downloadSpeed: parseIntStr,
  uploadSpeed: parseIntStr,
  numActive: parseIntStr,
  numWaiting: parseIntStr,
  numStopped: parseIntStr,
  numStoppedTotal: parseIntStr,
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
