import browser, { type Menus, type Tabs } from "webextension-polyfill";
import type { BackgroundContext } from "@/background/context";
import type { ExtensionOptions } from "@/domain/extension-options";
import { getCookies } from "@/platform/cookies";
import i18n from "@/platform/i18n";
import { captureUrl } from "@/services/capture";
import { runWithNotification } from "@/services/notify";
import type { OptionsStore } from "@/services/options-store";

export const CONTEXT_MENUS_PARENT_ID = "aria2-integration";
const CONTEXTS: Menus.ContextType[] = ["link", "selection"];

// One "Download with aria2" entry per server, grouped under a parent entry when there are several servers.
export async function createContextMenus(extensionOptions: ExtensionOptions) {
  await browser.contextMenus?.removeAll();
  const servers = Object.entries(extensionOptions.servers);
  if (servers.length === 1) {
    browser.contextMenus?.create({ title: i18n("contextMenusTitle"), id: servers[0][0], contexts: CONTEXTS });
  } else if (servers.length > 1) {
    browser.contextMenus?.create({ title: i18n("contextMenusTitle"), id: CONTEXT_MENUS_PARENT_ID, contexts: CONTEXTS });
    for (const [id, server] of servers) {
      browser.contextMenus?.create({ title: `${server.name}`, parentId: CONTEXT_MENUS_PARENT_ID, id, contexts: CONTEXTS });
    }
  }
}

// Creates the context menus once the options are loaded, then recreates them whenever the options change.
export function keepContextMenusInSync(store: OptionsStore) {
  // Menus are recreated one after the other: interleaved removeAll/create calls would create duplicates.
  let rebuilds = Promise.resolve();
  const rebuild = (options: ExtensionOptions) => {
    rebuilds = rebuilds.then(() => createContextMenus(options)).catch((error) => console.error(error));
  };
  store.ready().then((options) => {
    rebuild(options);
    store.subscribe(rebuild);
  });
}

export function getSelectedUrls(onClickData: Menus.OnClickData): string[] {
  if (onClickData.linkUrl) {
    return [onClickData.linkUrl];
  }
  if (onClickData.selectionText) {
    return onClickData.selectionText.split(/\s+/);
  }
  return [];
}

export function createContextMenuClickHandler({ store, connections }: BackgroundContext) {
  return async (info: Menus.OnClickData, tab?: Tabs.Tab) => {
    const options = await store.ready();
    const serverId = String(info.menuItemId);
    const server = options.servers[serverId];
    const connection = connections.get(serverId);
    if (server === undefined || connection === undefined) {
      return;
    }
    const referer = tab?.url ?? "";
    const incognito = !!tab?.incognito;
    await Promise.all(
      getSelectedUrls(info).map(async (url) => {
        const cookies = await getCookies(url, tab?.cookieStoreId);
        await runWithNotification(() => captureUrl(connection, server, { url, referer, cookies, incognito }), {
          success: options.notifyUrlIsAdded ? i18n("addUrlSuccess", server.name) : undefined,
          error: options.notifyErrorOccurs ? i18n("addUrlError", server.name) : undefined,
        });
      }),
    );
  };
}
