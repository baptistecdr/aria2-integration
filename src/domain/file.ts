import * as z from "zod/mini";
import { intFromString } from "@/domain/zod";

export const UrisSchema = z.object({
  uri: z.string(),
});

export const FileSchema = z.object({
  completedLength: intFromString,
  length: intFromString,
  path: z.string(),
  uris: z.array(UrisSchema),
});

export type File = z.infer<typeof FileSchema>;
