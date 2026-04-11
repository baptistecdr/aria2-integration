import * as z from "zod/mini";
import { FileSchema } from "@/popup/models/file";
import { basename } from "@/stdlib";

export enum TaskStatus {
  Active = "active",
  Complete = "complete",
  Error = "error",
  Paused = "paused",
  Removed = "removed",
  Waiting = "waiting",
}

const BittorrentSchema = z.object({
  info: z.object({
    name: z.string(),
  }),
});

const parseIntStr = z.pipe(
  z.string(),
  z.transform((v) => Number.parseInt(v, 10)),
);

const TaskSchema = z.object({
  bittorrent: z.optional(BittorrentSchema),
  completedLength: parseIntStr,
  connections: parseIntStr,
  downloadSpeed: parseIntStr,
  files: z.array(FileSchema),
  gid: z.string(),
  numSeeders: parseIntStr,
  status: z.enum(TaskStatus),
  totalLength: parseIntStr,
  uploadLength: parseIntStr,
  uploadSpeed: parseIntStr,
  errorMessage: z.string(),
  dir: z.string(),
});

export type TaskData = z.infer<typeof TaskSchema>;
export type Bittorrent = z.infer<typeof BittorrentSchema>;

export class Task implements TaskData {
  bittorrent?: Bittorrent;
  completedLength: number;
  connections: number;
  downloadSpeed: number;
  files: TaskData["files"];
  gid: string;
  numSeeders: number;
  status: TaskStatus;
  totalLength: number;
  uploadLength: number;
  uploadSpeed: number;
  errorMessage: string;
  dir: string;

  constructor(data: TaskData) {
    this.bittorrent = data.bittorrent;
    this.completedLength = data.completedLength;
    this.connections = data.connections;
    this.downloadSpeed = data.downloadSpeed;
    this.files = data.files;
    this.gid = data.gid;
    this.numSeeders = data.numSeeders;
    this.status = data.status;
    this.totalLength = data.totalLength;
    this.uploadLength = data.uploadLength;
    this.uploadSpeed = data.uploadSpeed;
    this.errorMessage = data.errorMessage;
    this.dir = data.dir;
  }

  static parse(data: unknown): Task {
    return new Task(TaskSchema.parse(data));
  }

  static parseMany(data: unknown[]): Task[] {
    return data.map((item) => Task.parse(item));
  }

  getFilename(): string {
    if (this.bittorrent?.info) {
      return this.bittorrent.info.name;
    }
    if (this.files[0].path !== "") {
      return basename(this.files[0].path);
    }
    return basename(this.files[0].uris[0].uri);
  }

  isActive(): boolean {
    return this.status === TaskStatus.Active;
  }

  isComplete(): boolean {
    return this.status === TaskStatus.Complete;
  }

  isError(): boolean {
    return this.status === TaskStatus.Error;
  }

  isPaused(): boolean {
    return this.status === TaskStatus.Paused;
  }

  isRemoved(): boolean {
    return this.status === TaskStatus.Removed;
  }

  isWaiting(): boolean {
    return this.status === TaskStatus.Waiting;
  }
}
