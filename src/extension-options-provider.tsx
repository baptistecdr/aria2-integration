import { createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useEffect, useState } from "react";
import { ExtensionOptions } from "@/models/extension-options";
import { applyTheme } from "@/models/theme";

interface ExtensionOptionsContextValue {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: Dispatch<SetStateAction<ExtensionOptions>>;
  managedOptions: Partial<ExtensionOptions>;
}

const ExtensionOptionsContext = createContext<ExtensionOptionsContextValue>({
  extensionOptions: ExtensionOptions.create(),
  setExtensionOptions: () => {},
  managedOptions: {},
});

interface ExtensionOptionsProviderProps {
  children: ReactNode;
}

function ExtensionOptionsProvider({ children }: ExtensionOptionsProviderProps) {
  const [extensionOptions, setExtensionOptions] = useState(ExtensionOptions.create());
  const [managedOptions, setManagedOptions] = useState<Partial<ExtensionOptions>>({});

  useEffect(() => {
    ExtensionOptions.fromStorage().then(setExtensionOptions);
    ExtensionOptions.fromManagedStorage().then(setManagedOptions);
  }, []);

  useEffect(() => {
    applyTheme(extensionOptions.theme);
  }, [extensionOptions.theme]);

  return <ExtensionOptionsContext.Provider value={{ extensionOptions, setExtensionOptions, managedOptions }}>{children}</ExtensionOptionsContext.Provider>;
}

function useExtensionOptions(): ExtensionOptionsContextValue {
  return useContext(ExtensionOptionsContext);
}

export { ExtensionOptionsProvider, useExtensionOptions };
