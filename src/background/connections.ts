import Aria2 from "@baptistecdr/aria2";
import type { Server } from "@/domain/server";
import type { OptionsStore } from "@/services/options-store";

// The aria2 clients of the configured servers, always matching the current options.
export interface Connections {
  get(serverId: string): Aria2 | undefined;
  all(): [Server, Aria2][];
}

export function createConnections(store: OptionsStore): Connections {
  // A client is reused until its server settings change.
  const cache = new Map<string, { settings: string; client: Aria2 }>();

  const clientFor = (serverId: string, server: Server) => {
    const settings = JSON.stringify(server);
    const cached = cache.get(serverId);
    if (cached?.settings === settings) {
      return cached.client;
    }
    const client = new Aria2(server);
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
