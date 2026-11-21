import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Tabs } from "webextension-polyfill";
import { findCurrentTab } from "@/platform/tabs";

const CurrentTabContext = createContext<Tabs.Tab | undefined>(undefined);

interface CurrentTabProviderProps {
  children: ReactNode;
}

function CurrentTabProvider({ children }: CurrentTabProviderProps) {
  const [currentTab, setCurrentTab] = useState<Tabs.Tab | undefined>(undefined);

  useEffect(() => {
    findCurrentTab().then(setCurrentTab);
  }, []);

  return <CurrentTabContext.Provider value={currentTab}>{children}</CurrentTabContext.Provider>;
}

function useCurrentTab(): Tabs.Tab | undefined {
  return useContext(CurrentTabContext);
}

export { CurrentTabProvider, useCurrentTab };
