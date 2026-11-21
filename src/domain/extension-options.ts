import * as z from "zod/mini";
import { Server, ServerSchema } from "@/domain/server";
import Theme from "@/domain/theme";

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

  // Throws when the serialized options are not valid JSON or do not match the schema.
  deserialize(serialized: string): ExtensionOptions {
    return ExtensionOptions.create(JSON.parse(serialized));
  },

  withOverrides(options: ExtensionOptions, overrides: Partial<ExtensionOptions>): ExtensionOptions {
    return ExtensionOptions.create({ ...options, ...overrides });
  },

  // Adds the server, or replaces the one with the same uuid.
  withServer(options: ExtensionOptions, server: Server): ExtensionOptions {
    return ExtensionOptions.withOverrides(options, {
      servers: { ...options.servers, [server.uuid]: server },
    });
  },

  // Removes the server and stops capturing downloads if it was the capture server.
  withoutServer(options: ExtensionOptions, server: Server): ExtensionOptions {
    const remainingServers = { ...options.servers };
    delete remainingServers[server.uuid];
    const overrides: Partial<ExtensionOptions> = { servers: remainingServers };
    if (options.captureServer === server.uuid) {
      overrides.captureServer = "";
      overrides.captureDownloads = false;
    }
    return ExtensionOptions.withOverrides(options, overrides);
  },

  // Whether downloads are captured without a server to send them to: capture downloads needs an existing capture server.
  capturesWithoutServer(options: ExtensionOptions): boolean {
    return options.captureDownloads && options.servers[options.captureServer] === undefined;
  },

  // Converts the options set by an enterprise policy into overrides of the user options.
  // Throws when the policy is invalid.
  parseManagedOverrides(managed: Record<string, unknown>): Partial<ExtensionOptions> {
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
  },
};
