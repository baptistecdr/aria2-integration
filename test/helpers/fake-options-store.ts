import { vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import type { ManagedOption, OptionsListener, OptionsStore } from "@/services/options-store";

// An in-memory OptionsStore: updates apply immediately and notify the subscribers. Managed options can't be changed.
export function fakeOptionsStore(initial: Partial<ExtensionOptions> = {}, managedOptions: ManagedOption[] = []) {
  const managed: ReadonlySet<ManagedOption> = new Set(managedOptions);
  let current = ExtensionOptions.create(initial);
  const listeners = new Set<OptionsListener>();
  const store = {
    ready: vi.fn(async () => current),
    get: vi.fn(() => current),
    managed: vi.fn(() => managed),
    update: vi.fn(async (updater: (options: ExtensionOptions) => ExtensionOptions) => {
      const changed = updater(current);
      current = ExtensionOptions.withOverrides(changed, Object.fromEntries(managedOptions.map((option) => [option, current[option]])));
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
