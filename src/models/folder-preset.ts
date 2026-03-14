import { v4 as uuidv4 } from "uuid";

export default class FolderPreset {
  constructor(
    public readonly id: string = uuidv4(),
    public readonly name: string = "",
    public readonly path: string = "",
  ) {}

  serialize(): string {
    return JSON.stringify(this);
  }

  static deserialize(preset: string): FolderPreset {
    return Object.assign(new FolderPreset(), JSON.parse(preset));
  }
}
