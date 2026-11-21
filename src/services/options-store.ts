import { ExtensionOptions } from "@/domain/extension-options";
import { onStorageChanged, readManagedStorage, readSyncStorage, writeSyncStorage } from "@/platform/storage";

const OPTIONS_KEY = "options";

// The options set by an enterprise policy: they can't be changed by the user.
export type ManagedOption = keyof ExtensionOptions;

const NO_MANAGED_OPTIONS: ReadonlySet<ManagedOption> = new Set();

interface StoredOptions {
  // What the user chose, as saved in storage.
  userOptions: ExtensionOptions;
  // What the enterprise policy sets on top of it.
  policy: Partial<ExtensionOptions>;
}

async function readStoredOptions(): Promise<StoredOptions> {
  const storage = await readSyncStorage();
  let userOptions = ExtensionOptions.create();
  if (typeof storage[OPTIONS_KEY] === "string") {
    try {
      userOptions = ExtensionOptions.deserialize(storage[OPTIONS_KEY]);
    } catch (error) {
      console.error(error);
    }
  }
  let policy: Partial<ExtensionOptions> = {};
  const managed = await readManagedStorage();
  if (managed && Object.keys(managed).length > 0) {
    try {
      policy = ExtensionOptions.parseManagedOverrides(managed);
    } catch (error) {
      console.error("Invalid managed storage configuration", error);
    }
  }
  return { userOptions, policy };
}

function effectiveOptions({ userOptions, policy }: StoredOptions): ExtensionOptions {
  return ExtensionOptions.withOverrides(userOptions, policy);
}

// Reads the user options and applies the enterprise policy on top of them.
export async function loadOptions(): Promise<ExtensionOptions> {
  return effectiveOptions(await readStoredOptions());
}

export async function saveOptions(options: ExtensionOptions): Promise<void> {
  await writeSyncStorage({ [OPTIONS_KEY]: ExtensionOptions.serialize(options) });
}

export type OptionsListener = (options: ExtensionOptions) => void;
export type OptionsUpdater = (current: ExtensionOptions) => ExtensionOptions;

/**
 * Single source of truth for the extension options, in each extension context (background, popup, options page).
 *
 * - `ready()` resolves once the options are loaded from storage: anything reading the options right after the context
 *   starts (e.g. a background event dispatched at browser startup) must wait for it.
 * - `update()` always applies the change to the latest stored options, so concurrent writers (options page, popup,
 *   keyboard shortcut) do not overwrite each other with stale values.
 * - `subscribe()` notifies about every change, wherever it was made.
 * - `managed()` tells which options are set by an enterprise policy. Changing them has no effect: the user's own values
 *   stay in storage, and apply again if the policy stops setting them.
 */
export interface OptionsStore {
  ready(): Promise<ExtensionOptions>;
  get(): ExtensionOptions;
  managed(): ReadonlySet<ManagedOption>;
  update(updater: OptionsUpdater): Promise<ExtensionOptions>;
  subscribe(listener: OptionsListener): () => void;
  dispose(): void;
}

interface State {
  options: ExtensionOptions;
  managed: ReadonlySet<ManagedOption>;
}

function stateOf(stored: StoredOptions): State {
  const managedOptions = Object.keys(stored.policy) as ManagedOption[];
  return { options: effectiveOptions(stored), managed: managedOptions.length > 0 ? new Set(managedOptions) : NO_MANAGED_OPTIONS };
}

const sameManaged = (a: ReadonlySet<ManagedOption>, b: ReadonlySet<ManagedOption>) => a.size === b.size && [...a].every((option) => b.has(option));

export function createOptionsStore(): OptionsStore {
  // Replaced, never mutated: get() and managed() return the same objects until something changes.
  let state: State = { options: ExtensionOptions.create(), managed: NO_MANAGED_OPTIONS };
  const listeners = new Set<OptionsListener>();
  // Writes are chained so that each update reads what the previous one wrote.
  let updates: Promise<unknown> = Promise.resolve();

  const set = (next: State) => {
    if (ExtensionOptions.serialize(next.options) === ExtensionOptions.serialize(state.options) && sameManaged(next.managed, state.managed)) {
      return;
    }
    state = next;
    for (const listener of listeners) {
      listener(state.options);
    }
  };

  const reload = async () => {
    try {
      set(stateOf(await readStoredOptions()));
    } catch (error) {
      // Keep the current options: the next change will try again.
      console.error(error);
    }
  };

  // Registered synchronously, before anything is awaited, so that no change is missed.
  const removeStorageListener = onStorageChanged((changes, areaName) => {
    if ((areaName === "sync" && changes[OPTIONS_KEY]) || areaName === "managed") {
      updates = updates.then(reload);
    }
  });
  const loaded = reload();

  return {
    ready: () => loaded.then(() => state.options),
    get: () => state.options,
    managed: () => state.managed,
    update(updater) {
      const update = updates.then(async () => {
        await loaded;
        const stored = await readStoredOptions();
        const changed = updater(effectiveOptions(stored));
        // The options set by the policy keep the user's own values in storage: the policy applies on top of them.
        const userOptions = ExtensionOptions.withOverrides(
          changed,
          Object.fromEntries(Object.keys(stored.policy).map((key) => [key, stored.userOptions[key as ManagedOption]])),
        );
        await saveOptions(userOptions);
        const next = stateOf({ userOptions, policy: stored.policy });
        set(next);
        return next.options;
      });
      updates = update.catch(() => {});
      return update;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      removeStorageListener();
      listeners.clear();
    },
  };
}
