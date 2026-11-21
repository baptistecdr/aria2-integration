import * as z from "zod/mini";
import { FileSchema } from "@/domain/file";
import { basename } from "@/domain/paths";
import { intFromString } from "@/domain/zod";

export enum TaskStatus {
  Active = "active",
  Complete = "complete",
  Error = "error",
  Paused = "paused",
  Removed = "removed",
  Waiting = "waiting",
}

const BittorrentSchema = z.object({
  info: z.optional(
    z.object({
      name: z.string(),
    }),
  ),
});

const TaskSchema = z.object({
  bittorrent: z.optional(BittorrentSchema),
  completedLength: intFromString,
  connections: intFromString,
  downloadSpeed: intFromString,
  files: z.array(FileSchema),
  gid: z.string(),
  status: z.enum(TaskStatus),
  totalLength: intFromString,
  uploadLength: intFromString,
  uploadSpeed: intFromString,
  dir: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;
export type Bittorrent = z.infer<typeof BittorrentSchema>;

export const Task = {
  parse(data: unknown): Task {
    return TaskSchema.parse(data);
  },

  parseMany(data: unknown[]): Task[] {
    return data.map((item) => Task.parse(item));
  },

  // The torrent name, or the name of the first file, or the end of its first URL.
  filename(task: Task): string {
    if (task.bittorrent?.info) {
      return task.bittorrent.info.name;
    }
    if (task.files[0].path !== "") {
      return basename(task.files[0].path);
    }
    return basename(task.files[0].uris[0].uri);
  },

  isActive: (task: Task) => task.status === TaskStatus.Active,
  isComplete: (task: Task) => task.status === TaskStatus.Complete,
  isError: (task: Task) => task.status === TaskStatus.Error,
  isPaused: (task: Task) => task.status === TaskStatus.Paused,
  isRemoved: (task: Task) => task.status === TaskStatus.Removed,
  isWaiting: (task: Task) => task.status === TaskStatus.Waiting,

  // Whether aria2 keeps the task only as a result: complete, failed or removed.
  isStopped: (task: Task) => Task.isComplete(task) || Task.isError(task) || Task.isRemoved(task),
};
