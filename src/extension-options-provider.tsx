import { createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useEffect, useState } from "react";
import ExtensionOptions from "@/models/extension-options";
import { applyTheme } from "@/models/theme";

interface ExtensionOptionsContextValue {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: Dispatch<SetStateAction<ExtensionOptions>>;
}

const ExtensionOptionsContext = createContext<ExtensionOptionsContextValue>({
  extensionOptions: new ExtensionOptions(),
  setExtensionOptions: () => {},
});

interface ExtensionOptionsProviderProps {
  children: ReactNode;
}

function ExtensionOptionsProvider({ children }: ExtensionOptionsProviderProps) {
  const [extensionOptions, setExtensionOptions] = useState(new ExtensionOptions());

  useEffect(() => {
    ExtensionOptions.fromStorage().then(setExtensionOptions);
  }, []);

  useEffect(() => {
    applyTheme(extensionOptions.theme);
  }, [extensionOptions.theme]);

  return <ExtensionOptionsContext.Provider value={{ extensionOptions, setExtensionOptions }}>{children}</ExtensionOptionsContext.Provider>;
}

function useExtensionOptions(): ExtensionOptionsContextValue {
  return useContext(ExtensionOptionsContext);
}

export { ExtensionOptionsProvider, useExtensionOptions };
