import browser from "webextension-polyfill";
import type FolderPreset from "@/models/folder-preset";
import type Server from "@/models/server";
import Theme from "@/models/theme";

export default class ExtensionOptions {
  constructor(
    public readonly servers: Record<string, Server> = {},
    public readonly captureServer: string = "",
    public readonly captureDownloads: boolean = false,
    public readonly minFileSizeInBytes: number = 0,
    public readonly excludedProtocols: string[] = [],
    public readonly excludedSites: string[] = [],
    public readonly excludedFileTypes: string[] = [],
    public readonly useCompleteFilePath: boolean = false,
    public readonly notifyUrlIsAdded: boolean = true,
    public readonly notifyFileIsAdded: boolean = true,
    public readonly notifyErrorOccurs: boolean = true,
    public readonly theme: Theme = Theme.Auto,
    public readonly folderPresets: FolderPreset[] = [],
    public readonly askForFolderOnDownload: boolean = false,
    public readonly defaultFolder: string = "",
  ) {}

  public serialize(): string {
    return JSON.stringify(this);
  }

  private static deserialize(object: string): ExtensionOptions {
    return Object.assign(new ExtensionOptions(), JSON.parse(object));
  }

  private copy(): ExtensionOptions {
    return ExtensionOptions.deserialize(this.serialize());
  }

  async toStorage(): Promise<ExtensionOptions> {
    await browser.storage.sync.set({
      options: JSON.stringify(this),
    });
    return this;
  }

  async addServer(server: Server): Promise<ExtensionOptions> {
    const newExtensionOptions = this.copy();
    newExtensionOptions.servers[server.uuid] = server;
    return newExtensionOptions.toStorage();
  }

  async deleteServer(server: Server): Promise<ExtensionOptions> {
    const newExtensionOptions = this.copy();
    delete newExtensionOptions.servers[server.uuid];
    return newExtensionOptions.toStorage();
  }

  async addFolderPreset(preset: FolderPreset): Promise<ExtensionOptions> {
    const newExtensionOptions = this.copy();
    (newExtensionOptions.folderPresets as FolderPreset[]).push(preset);
    return newExtensionOptions.toStorage();
  }

  async updateFolderPreset(preset: FolderPreset): Promise<ExtensionOptions> {
    const newExtensionOptions = this.copy();
    const index = newExtensionOptions.folderPresets.findIndex((p) => p.id === preset.id);
    if (index !== -1) {
      (newExtensionOptions.folderPresets as FolderPreset[])[index] = preset;
    }
    return newExtensionOptions.toStorage();
  }

  async deleteFolderPreset(id: string): Promise<ExtensionOptions> {
    const newExtensionOptions = this.copy();
    const index = newExtensionOptions.folderPresets.findIndex((p) => p.id === id);
    if (index !== -1) {
      (newExtensionOptions.folderPresets as FolderPreset[]).splice(index, 1);
    }
    return newExtensionOptions.toStorage();
  }

  static async fromStorage(): Promise<ExtensionOptions> {
    const storage = await browser.storage.sync.get(null);
    if (storage.options) {
      return ExtensionOptions.deserialize(storage.options as string);
    }
    return new ExtensionOptions();
  }
}
