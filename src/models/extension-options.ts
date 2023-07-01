import browser from "webextension-polyfill";
import Server from "./server";
import Theme from "./theme";

export default class ExtensionOptions {
  constructor(
    public readonly servers: Record<string, Server> = {},
    public readonly captureServer: string = "",
    public readonly captureDownloads: boolean = false,
    public readonly excludedProtocols: string[] = [],
    public readonly excludedSites: string[] = [],
    public readonly excludedFileTypes: string[] = [],
    public readonly theme: Theme = Theme.Auto,
  ) {}

  private serialize(): string {
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

  static async fromStorage(): Promise<ExtensionOptions> {
    const storage = await browser.storage.sync.get(null);
    if (storage.options) {
      const extensionOptions = ExtensionOptions.deserialize(storage.options);
      if (!extensionOptions.servers) {
        // Legacy
        Object.keys(storage).forEach((key) => {
          if (key !== "options") {
            browser.storage.sync.remove(key);
          }
        });
      }
      return extensionOptions;
    }
    return new ExtensionOptions();
  }
}
