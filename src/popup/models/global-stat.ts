import "reflect-metadata";
import { Transform, Type } from "class-transformer";

export default class GlobalStat {
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  downloadSpeed: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  uploadSpeed: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  numActive: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  numWaiting: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  numStopped: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  numStoppedTotal: number;

  constructor(downloadSpeed: number, uploadSpeed: number, numActive: number, numWaiting: number, numStopped: number, numStoppedTotal: number) {
    this.downloadSpeed = downloadSpeed;
    this.uploadSpeed = uploadSpeed;
    this.numActive = numActive;
    this.numWaiting = numWaiting;
    this.numStopped = numStopped;
    this.numStoppedTotal = numStoppedTotal;
  }

  static default(): GlobalStat {
    return new GlobalStat(0, 0, 0, 0, 0, 0);
  }
}
