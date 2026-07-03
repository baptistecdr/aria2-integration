import * as z from "zod";

// Simple string-to-number conversion (no need for transform with full zod)
const numStr = z.string().transform((v: string) => {
  const n = Number(v);
  if (isNaN(n)) throw new Error("Invalid number");
  return n;
});

const GlobalStatSchema = z.object({
  downloadSpeed: z.union([z.number(), numStr]),
  uploadSpeed: z.union([z.number(), numStr]),
  numActive: z.union([z.number(), numStr]),
  numWaiting: z.union([z.number(), numStr]),
  numStopped: z.union([z.number(), numStr]),
  numStoppedTotal: z.union([z.number(), numStr]),
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
  if (typeof data !== "object" || data === null) {
    throw new Error("Input must be an object");
  }
  
  const obj = data as Record<string, unknown>;
  const coerced: any = {};
  
  for (const key in obj) {
    const val = obj[key];
    if (val === undefined || val === null) {
      coerced[key] = 0;
    } else {
      const n = Number(val);
      if (isNaN(n)) {
        throw new Error(`Invalid number for ${key}`);
      }
      coerced[key] = n;
    }
  }
  
  return GlobalStatSchema.parse(coerced);
}

export function defaultGlobalStat(): GlobalStat {
  return { ...DEFAULT_GLOBAL_STAT };
}
