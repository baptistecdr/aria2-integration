import type { Connections } from "@/background/connections";
import type { OptionsStore } from "@/services/options-store";

// What the background handlers depend on, created once by the composition root (background/index.ts).
export interface BackgroundContext {
  store: OptionsStore;
  connections: Connections;
}
