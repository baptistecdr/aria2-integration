import * as z from "zod/mini";

// aria2 returns every number as a string.
export const intFromString = z.pipe(
  z.string(),
  z.transform((v) => Number.parseInt(v, 10)),
);
