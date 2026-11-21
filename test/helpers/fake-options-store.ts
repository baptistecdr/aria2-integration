import { vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { CaptureServerMissingError, type ManagedOption, type OptionsListener, type OptionsStore } from "@/services/options-store";

// An in-memory OptionsStore: updates apply immediately and notify the subscribers. Managed options can't be changed, and
// like the real store, an update can't enable capture downloads without a capture server.
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
      const next = ExtensionOptions.withOverrides(changed, Object.fromEntries(managedOptions.map((option) => [option, current[option]])));
      if (ExtensionOptions.capturesWithoutServer(next) && !ExtensionOptions.capturesWithoutServer(current)) {
        throw new CaptureServerMissingError();
      }
      current = next;
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
