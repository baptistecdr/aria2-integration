import type Aria2 from "@baptistecdr/aria2";
import browser, { type Alarms } from "webextension-polyfill";
import type { BackgroundContext } from "@/background/context";
import { type GlobalStat, getGlobalStat } from "@/domain/global-stat";
import type { Server } from "@/domain/server";
import { findCurrentTab } from "@/platform/tabs";

export const ALARM_NAME = "set-badge";
const ALARM_INTERVAL_SECONDS = 5;
const BADGE_COLOR = "#666666";

export function scheduleBadgeUpdates() {
  browser.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_INTERVAL_SECONDS / 60 });
}

async function purgeDownloadsWhenInIncognitoMode(server: Server, aria2: Aria2, globalStat: GlobalStat) {
  if (!server.incognitoModeOptions?.automaticallyPurgeDownloads || globalStat.numStopped <= 0) return;

  const currentTab = await findCurrentTab();
  if (currentTab?.incognito) {
    await aria2.call("aria2.purgeDownloadResult");
  }
}

// Shows the number of active downloads of every server in the badge.
export function createBadgeUpdater({ store, connections }: BackgroundContext) {
  return async (alarm: Alarms.Alarm) => {
    if (alarm.name !== ALARM_NAME) {
      return;
    }
    await store.ready();
    const numActives = await Promise.all(
      connections.all().map(async ([server, aria2]) => {
        try {
          const globalStat = await getGlobalStat(aria2);
          await purgeDownloadsWhenInIncognitoMode(server, aria2, globalStat);
          return globalStat.numActive;
        } catch {
          // An unreachable server must not prevent the others from being counted.
          return 0;
        }
      }),
    );
    const totalActive = numActives.reduce((sum, numActive) => sum + numActive, 0);
    await browser.action.setBadgeText({ text: totalActive ? totalActive.toString(10) : "" });
    await browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  };
}
