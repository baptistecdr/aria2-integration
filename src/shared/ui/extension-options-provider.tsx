import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from "react";
import { ExtensionOptions } from "@/domain/extension-options";
import { createOptionsStore, type ManagedOption, type OptionsStore, type OptionsUpdater } from "@/services/options-store";
import { applyTheme } from "@/shared/ui/theme";

interface ExtensionOptionsContextValue {
  extensionOptions: ExtensionOptions;
  // The options set by an enterprise policy: the pages show them read-only.
  managedOptions: ReadonlySet<ManagedOption>;
  // Saves the change to storage; every page showing the options is then updated.
  updateExtensionOptions: (updater: OptionsUpdater) => Promise<ExtensionOptions>;
}

const ExtensionOptionsContext = createContext<ExtensionOptionsContextValue>({
  extensionOptions: ExtensionOptions.create(),
  managedOptions: new Set(),
  updateExtensionOptions: async (updater) => updater(ExtensionOptions.create()),
});

let pageStore: OptionsStore | undefined;

// One store per page: the popup and the options page each run in their own context.
function getPageStore(): OptionsStore {
  pageStore ??= createOptionsStore();
  return pageStore;
}

interface ExtensionOptionsProviderProps {
  children: ReactNode;
  store?: OptionsStore;
}

function ExtensionOptionsProvider({ children, store = getPageStore() }: ExtensionOptionsProviderProps) {
  // The defaults until the options are loaded, then the stored options, kept up to date by the store.
  const extensionOptions = useSyncExternalStore(store.subscribe, store.get);
  const managedOptions = useSyncExternalStore(store.subscribe, store.managed);

  useEffect(() => {
    applyTheme(extensionOptions.theme);
  }, [extensionOptions.theme]);

  return (
    <ExtensionOptionsContext.Provider value={{ extensionOptions, managedOptions, updateExtensionOptions: store.update }}>
      {children}
    </ExtensionOptionsContext.Provider>
  );
}

function useExtensionOptions(): ExtensionOptionsContextValue {
  return useContext(ExtensionOptionsContext);
}

export { ExtensionOptionsProvider, useExtensionOptions };
