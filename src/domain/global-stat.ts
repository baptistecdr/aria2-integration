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

export const GlobalStat = {
  parse(data: unknown): GlobalStat {
    return GlobalStatSchema.parse(data);
  },

  // The statistics shown until the server answers.
  empty(): GlobalStat {
    return { downloadSpeed: 0, uploadSpeed: 0, numActive: 0, numWaiting: 0, numStopped: 0, numStoppedTotal: 0 };
  },
};
