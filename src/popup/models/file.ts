import * as z from "zod/mini";

export const UrisSchema = z.object({
  uri: z.string(),
});

export const FileSchema = z.object({
  completedLength: z.pipe(
    z.string(),
    z.transform((v) => Number.parseInt(v, 10)),
  ),
  length: z.pipe(
    z.string(),
    z.transform((v) => Number.parseInt(v, 10)),
  ),
  path: z.string(),
  uris: z.array(UrisSchema),
});

export type File = z.infer<typeof FileSchema>;
