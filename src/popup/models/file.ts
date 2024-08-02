import "reflect-metadata";
import { Transform, Type } from "class-transformer";

export class File {
  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  completedLength: number;

  @Type(() => Number)
  @Transform(({ value }) => Number.parseInt(value, 10))
  length: number;

  path: string;

  uris: Uris[];

  constructor(completedLength: number, length: number, path: string, uris: Uris[]) {
    this.completedLength = completedLength;
    this.length = length;
    this.path = path;
    this.uris = uris;
  }
}

export interface Uris {
  uri: string;
}
