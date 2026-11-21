import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { ExtensionOptions } from "@/domain/extension-options";
import { createOptionsStore, type OptionsStore, type OptionsUpdater } from "@/services/options-store";
import { applyTheme } from "@/shared/ui/theme";

interface ExtensionOptionsContextValue {
  extensionOptions: ExtensionOptions;
  // Saves the change to storage; every page showing the options is then updated.
  updateExtensionOptions: (updater: OptionsUpdater) => Promise<ExtensionOptions>;
}

const ExtensionOptionsContext = createContext<ExtensionOptionsContextValue>({
  extensionOptions: ExtensionOptions.create(),
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
  const [extensionOptions, setExtensionOptions] = useState(store.get());

  useEffect(() => {
    const unsubscribe = store.subscribe(setExtensionOptions);
    store.ready().then(setExtensionOptions);
    return unsubscribe;
  }, [store]);

  useEffect(() => {
    applyTheme(extensionOptions.theme);
  }, [extensionOptions.theme]);

  return <ExtensionOptionsContext.Provider value={{ extensionOptions, updateExtensionOptions: store.update }}>{children}</ExtensionOptionsContext.Provider>;
}

function useExtensionOptions(): ExtensionOptionsContextValue {
  return useContext(ExtensionOptionsContext);
}

export { ExtensionOptionsProvider, useExtensionOptions };
