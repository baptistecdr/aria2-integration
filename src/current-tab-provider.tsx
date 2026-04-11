import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import browser, { type Tabs } from "webextension-polyfill";

export async function findCurrentTab(): Promise<Tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (tabs.length === 0) {
    return undefined;
  }
  return tabs[0];
}

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
