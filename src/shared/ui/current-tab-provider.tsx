import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { findCurrentTab, type Tab } from "@/platform/tabs";

const CurrentTabContext = createContext<Tab | undefined>(undefined);

interface CurrentTabProviderProps {
  children: ReactNode;
}

function CurrentTabProvider({ children }: CurrentTabProviderProps) {
  const [currentTab, setCurrentTab] = useState<Tab | undefined>(undefined);

  useEffect(() => {
    void findCurrentTab().then(setCurrentTab);
  }, []);

  return <CurrentTabContext.Provider value={currentTab}>{children}</CurrentTabContext.Provider>;
}

function useCurrentTab(): Tab | undefined {
  return useContext(CurrentTabContext);
}

export { CurrentTabProvider, useCurrentTab };
