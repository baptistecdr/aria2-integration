import browser from "webextension-polyfill";
import * as z from "zod/mini";
import { Server, ServerSchema } from "@/models/server";
import Theme from "@/models/theme";

const ExtensionOptionsSchema = z.object({
  servers: z._default(z.record(z.string(), ServerSchema), () => ({})),
  captureServer: z._default(z.string(), ""),
  captureDownloads: z._default(z.boolean(), false),
  minFileSizeInBytes: z._default(z.number(), 0),
  excludedProtocols: z._default(z.array(z.string()), () => []),
  excludedSites: z._default(z.array(z.string()), () => []),
  excludedFileTypes: z._default(z.array(z.string()), () => []),
  useCompleteFilePath: z._default(z.boolean(), false),
  notifyUrlIsAdded: z._default(z.boolean(), true),
  notifyFileIsAdded: z._default(z.boolean(), true),
  notifyErrorOccurs: z._default(z.boolean(), true),
  theme: z._default(z.enum(Theme), Theme.Auto),
});

export type ExtensionOptions = z.infer<typeof ExtensionOptionsSchema>;

export const ExtensionOptions = {
  create(data: Partial<ExtensionOptions> = {}): ExtensionOptions {
    return ExtensionOptionsSchema.parse(data);
  },

  serialize(options: ExtensionOptions): string {
    return JSON.stringify(options);
  },

  async toStorage(options: ExtensionOptions): Promise<ExtensionOptions> {
    await browser.storage.sync.set({
      options: ExtensionOptions.serialize(options),
    });
    return options;
  },

  withOverrides(options: ExtensionOptions, overrides: Partial<ExtensionOptions>): ExtensionOptions {
    return ExtensionOptions.create({ ...options, ...overrides });
  },

  addServer(options: ExtensionOptions, server: Server): Promise<ExtensionOptions> {
    return ExtensionOptions.toStorage(
      ExtensionOptions.withOverrides(options, {
        servers: { ...options.servers, [server.uuid]: server },
      }),
    );
  },

  deleteServer(options: ExtensionOptions, server: Server): Promise<ExtensionOptions> {
    const remainingServers = { ...options.servers };
    delete remainingServers[server.uuid];
    const overrides: Partial<ExtensionOptions> = { servers: remainingServers };
    if (options.captureServer === server.uuid) {
      overrides.captureServer = "";
      overrides.captureDownloads = false;
    }
    return ExtensionOptions.toStorage(ExtensionOptions.withOverrides(options, overrides));
  },

  async fromManagedStorage(): Promise<Partial<ExtensionOptions>> {
    try {
      const managed = (await browser.storage.managed?.get(null)) as Record<string, unknown> | undefined;
      if (!managed || Object.keys(managed).length === 0) {
        return {};
      }
      const { servers, ...rest } = managed;
      const overrides: Record<string, unknown> = { ...rest };
      if (Array.isArray(servers)) {
        // Policies can't use uuids as keys, so servers are given as a list; fall back to the name as identifier.
        overrides.servers = Object.fromEntries(
          servers.map((server: Partial<Server>) => {
            const created = Server.create({ ...server, uuid: server.uuid ?? server.name ?? "Localhost" });
            return [created.uuid, created];
          }),
        );
      } else if (servers && typeof servers === "object") {
        overrides.servers = servers;
      }
      return z.partial(ExtensionOptionsSchema).parse(overrides);
    } catch (error) {
      // Managed storage is unavailable or invalid: ignore it.
      console.error(error);
      return {};
    }
  },

  async fromStorage(): Promise<ExtensionOptions> {
    const storage = await browser.storage.sync.get(null);
    let options = ExtensionOptions.create();
    if (storage.options) {
      try {
        options = ExtensionOptions.create(JSON.parse(storage.options as string));
      } catch (error) {
        console.error(error);
      }
    }
    return ExtensionOptions.withOverrides(options, await ExtensionOptions.fromManagedStorage());
  },
};
