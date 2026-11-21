import { vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import type { OptionsListener, OptionsStore } from "@/services/options-store";

// An in-memory OptionsStore: updates apply immediately and notify the subscribers.
export function fakeOptionsStore(initial: Partial<ExtensionOptions> = {}) {
  let current = ExtensionOptions.create(initial);
  const listeners = new Set<OptionsListener>();
  const store = {
    ready: vi.fn(async () => current),
    get: vi.fn(() => current),
    update: vi.fn(async (updater: (options: ExtensionOptions) => ExtensionOptions) => {
      current = updater(current);
      for (const listener of listeners) listener(current);
      return current;
    }),
    subscribe: vi.fn((listener: OptionsListener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    dispose: vi.fn(),
  } satisfies OptionsStore;
  return store;
}
