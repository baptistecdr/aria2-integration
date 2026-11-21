import type { Server } from "@/domain/server";
import { type Aria2Client, createAria2Client } from "@/services/aria2-client";
import type { OptionsStore } from "@/services/options-store";

// The aria2 clients of the configured servers, always matching the current options.
export interface Connections {
  get(serverId: string): Aria2Client | undefined;
  all(): [Server, Aria2Client][];
}

export function createConnections(store: OptionsStore): Connections {
  // A client is reused until its server settings change.
  const cache = new Map<string, { settings: string; client: Aria2Client }>();

  const clientFor = (serverId: string, server: Server) => {
    const settings = JSON.stringify(server);
    const cached = cache.get(serverId);
    if (cached?.settings === settings) {
      return cached.client;
    }
    const client = createAria2Client(server);
    cache.set(serverId, { settings, client });
    return client;
  };

  return {
    get(serverId) {
      const server = store.get().servers[serverId];
      return server ? clientFor(serverId, server) : undefined;
    },
    all() {
      return Object.entries(store.get().servers).map(([serverId, server]) => [server, clientFor(serverId, server)]);
    },
  };
}
