import "reflect-metadata";
import { Transform, Type } from "class-transformer";
import type { File } from "@/popup/models/file";
import { basename } from "@/stdlib";

export enum TaskStatus {
  Active = "active",
  Complete = "complete",
  Error = "error",
  Paused = "paused",
  Removed = "removed",
  Waiting = "waiting",
}

export class Task {
  bittorrent?: Bittorrent;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  completedLength: number;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  connections: number;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  downloadSpeed: number;

  files: File[];

  gid: string;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  numSeeders: number;

  status: TaskStatus;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  totalLength: number;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  uploadLength: number;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  uploadSpeed: number;

  errorMessage: string;

  dir: string;

  constructor(
    completedLength: number,
    connections: number,
    downloadSpeed: number,
    files: File[],
    gid: string,
    numSeeders: number,
    status: TaskStatus,
    totalLength: number,
    uploadLength: number,
    uploadSpeed: number,
    errorMessage: string,
    dir: string,
    bittorrent?: Bittorrent,
  ) {
    this.bittorrent = bittorrent;
    this.completedLength = completedLength;
    this.connections = connections;
    this.downloadSpeed = downloadSpeed;
    this.files = files;
    this.gid = gid;
    this.numSeeders = numSeeders;
    this.status = status;
    this.totalLength = totalLength;
    this.uploadLength = uploadLength;
    this.uploadSpeed = uploadSpeed;
    this.errorMessage = errorMessage;
    this.dir = dir;
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

export interface Bittorrent {
  info: {
    name: string;
  };
}
