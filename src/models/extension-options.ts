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
    const managedOptions = await ExtensionOptions.fromManagedStorage();
    const managedKeys = Object.keys(managedOptions) as (keyof ExtensionOptions)[];
    if (managedKeys.length === 0) {
      await browser.storage.sync.set({ options: ExtensionOptions.serialize(options) });
      return options;
    }
    // Keep the user's own values for managed options, so nothing from the policy remains once it is removed.
    const storedOptions = await ExtensionOptions.fromSyncStorage();
    const userOptions = ExtensionOptions.withOverrides(options, Object.fromEntries(managedKeys.map((key) => [key, storedOptions[key]])));
    await browser.storage.sync.set({ options: ExtensionOptions.serialize(userOptions) });
    return ExtensionOptions.withOverrides(options, managedOptions);
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
    let managed: Record<string, unknown> | undefined;
    try {
      managed = await browser.storage.managed?.get(null);
    } catch {
      // Firefox rejects when no policy is configured: nothing to override.
      return {};
    }
    if (!managed || Object.keys(managed).length === 0) {
      return {};
    }
    try {
      const { servers, ...rest } = managed;
      const overrides: Record<string, unknown> = { ...rest };
      if (servers !== undefined) {
        // Policies can't use uuids as keys, so servers are given as a list and each one must carry its own uuid.
        const managedServers = z.array(z.looseObject({ uuid: z.uuid() })).parse(servers) as Partial<Server>[];
        if (new Set(managedServers.map((server) => server.uuid)).size !== managedServers.length) {
          throw new Error("Managed servers must have unique uuids");
        }
        overrides.servers = Object.fromEntries(managedServers.map((server) => [server.uuid, Server.create(server)]));
      }
      const parsed = z.partial(ExtensionOptionsSchema).parse(overrides);
      // Partial schemas still fill in defaults for missing fields: keep only the fields the policy actually sets.
      return Object.fromEntries(Object.entries(parsed).filter(([key]) => key in overrides));
    } catch (error) {
      console.error("Invalid managed storage configuration", error);
      return {};
    }
  },

  async fromSyncStorage(): Promise<ExtensionOptions> {
    const storage = await browser.storage.sync.get(null);
    if (storage.options) {
      try {
        return ExtensionOptions.create(JSON.parse(storage.options as string));
      } catch (error) {
        console.error(error);
      }
    }
    return ExtensionOptions.create();
  },

  async fromStorage(): Promise<ExtensionOptions> {
    return ExtensionOptions.withOverrides(await ExtensionOptions.fromSyncStorage(), await ExtensionOptions.fromManagedStorage());
  },

  // Options set by a policy can't be changed by the user: capture downloads and its server are toggled together.
  isCaptureManaged(managedOptions: Partial<ExtensionOptions>): boolean {
    return "captureDownloads" in managedOptions || "captureServer" in managedOptions;
  },
};
