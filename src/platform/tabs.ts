import browser, { type Tabs } from "webextension-polyfill";

export type Tab = Tabs.Tab;

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
