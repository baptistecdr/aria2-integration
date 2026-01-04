// @ts-expect-error No type information for aria2
import Aria2 from "@baptistecdr/aria2";
import { plainToInstance } from "class-transformer";
import type { Cookies, Downloads, Menus, Tabs } from "webextension-polyfill";
import browser from "webextension-polyfill";
import { captureTorrentFromURL, captureURL, isChromium, isFirefox, showNotification } from "@/aria2-extension";
import i18n from "@/i18n";
import ExtensionOptions from "@/models/extension-options";
import type Server from "@/models/server";
import GlobalStat from "@/popup/models/global-stat";
import { basename, dirname } from "@/stdlib";

export const CONTEXT_MENUS_PARENT_ID = "aria2-integration";
export const ALARM_NAME = "set-badge";
const ALARM_INTERVAL_SECONDS = 5;

let connections: Record<string, Aria2> = {};
const downloadItems: Record<string, Downloads.DownloadItem> = {};

export function createConnections(extensionOptions: ExtensionOptions) {
  const conns: Record<string, Aria2> = {};
  for (const [key, server] of Object.entries(extensionOptions.servers)) {
    conns[key] = new Aria2(server);
  }
  return conns;
}

async function createExtensionContextMenus() {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    title: i18n("contextMenusTitle"),
    id: CONTEXT_MENUS_PARENT_ID,
    contexts: ["link", "selection"],
  });
}

async function createServersContextMenus(extensionOptions: ExtensionOptions) {
  for (const [id, server] of Object.entries(extensionOptions.servers)) {
    browser.contextMenus.create({
      title: `${server.name}`,
      parentId: CONTEXT_MENUS_PARENT_ID,
      id,
      contexts: ["link", "selection"],
    });
  }
}

async function createSingleServerContextMenus(extensionOptions: ExtensionOptions) {
  await browser.contextMenus.removeAll();
  for (const [id] of Object.entries(extensionOptions.servers)) {
    browser.contextMenus.create({
      title: i18n("contextMenusTitle"),
      id,
      contexts: ["link", "selection"],
    });
  }
}

export async function createContextMenus(extensionOptions: ExtensionOptions) {
  if (Object.keys(extensionOptions.servers).length === 1) {
    await createSingleServerContextMenus(extensionOptions);
  } else if (Object.keys(extensionOptions.servers).length > 1) {
    await createExtensionContextMenus();
    await createServersContextMenus(extensionOptions);
  } else {
    await browser.contextMenus.removeAll();
  }
}

ExtensionOptions.fromStorage().then(async (extensionOptions) => {
  connections = createConnections(extensionOptions);
  await createContextMenus(extensionOptions);
});

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await browser.runtime.openOptionsPage();
  }
});

browser.storage.onChanged.addListener(listenerStorageOnChanged);

export async function listenerStorageOnChanged(changes: Record<string, browser.Storage.StorageChange>) {
  if (changes.options) {
    const extensionOptions = await ExtensionOptions.fromStorage();
    connections = createConnections(extensionOptions);
    await createContextMenus(extensionOptions);
  }
}

// Handle folder picker response messages
browser.runtime.onMessage.addListener(async (msg: unknown) => {
  const message = msg as { type: string; folder?: string; cancelled?: boolean };
  if (message.type === "folderPickerResponse") {
    const storage = await browser.storage.local.get("pendingDownload");
    const pendingDownload = storage.pendingDownload as { serverId: string; urls: string[]; referer: string; cookies: string } | undefined;

    if (!pendingDownload) return;

    // Clear pending download
    await browser.storage.local.remove("pendingDownload");

    if (message.cancelled) return;

    const extensionOptions = await ExtensionOptions.fromStorage();
    const connection = connections[pendingDownload.serverId];
    const server = extensionOptions.servers[pendingDownload.serverId];

    for (const url of pendingDownload.urls) {
      captureURL(connection, server, url, pendingDownload.referer, pendingDownload.cookies, message.folder)
        .then(() => {
          if (extensionOptions.notifyUrlIsAdded) {
            showNotification(i18n("addUrlSuccess", server.name));
          }
        })
        .catch(() => {
          if (extensionOptions.notifyErrorOccurs) {
            showNotification(i18n("addUrlError", server.name));
          }
        });
    }
  }
});

export function formatCookies(cookies: Cookies.Cookie[]) {
  return cookies.reduce((acc, cookie) => {
    return `${acc}${cookie.name}=${cookie.value};`;
  }, "");
}

async function getCookies(url: string, cookieStoreID?: string): Promise<string> {
  return formatCookies(await browser.cookies.getAll({ url, storeId: cookieStoreID }));
}

async function findCurrentTab(): Promise<Tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (tabs.length === 0) {
    return undefined;
  }
  return tabs[0];
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

export function downloadItemMustBeCaptured(extensionOptions: ExtensionOptions, item: Downloads.DownloadItem, referrer: string): boolean {
  if (extensionOptions.captureServer !== "") {
    let excludedProtocols = extensionOptions.excludedProtocols.map((p) => `${p}:`);
    excludedProtocols.push("blob:", "data:", "file:");
    excludedProtocols = [...new Set(excludedProtocols)];
    const excludedFileTypesRegExp = new RegExp(`${extensionOptions.excludedFileTypes.join("$|")}$`);

    // @ts-expect-error finalUrl exists only on Chromium
    const url = new URL(item.finalUrl ?? item.url);
    const refererURL = referrer !== "" ? new URL(referrer) : null;

    if (item.totalBytes !== -1 && item.totalBytes < extensionOptions.minFileSizeInBytes) {
      return false;
    }

    if (excludedProtocols.includes(url.protocol)) {
      return false;
    }

    if (extensionOptions.excludedSites.map((site) => url.hostname.includes(site)).includes(true)) {
      return false;
    }

    if (refererURL && extensionOptions.excludedSites.map((site) => refererURL.hostname.includes(site)).includes(true)) {
      return false;
    }

    return !(
      extensionOptions.excludedFileTypes.length > 0 &&
      (excludedFileTypesRegExp.test(url.pathname) ||
        (refererURL && excludedFileTypesRegExp.test(refererURL.pathname)) ||
        excludedFileTypesRegExp.test(item.filename))
    );
  }
  return false;
}

export async function captureDownloadItem(
  aria2: any,
  server: Server,
  item: Downloads.DownloadItem,
  referer: string,
  cookies: string,
  useCompleteFilePath: boolean,
) {
  // @ts-expect-error finalUrl exists only on Chromium
  const url = item.finalUrl ?? item.url;
  const directory = useCompleteFilePath ? dirname(item.filename) : undefined;
  const filename = basename(item.filename);
  if (url.match(/\.torrent$|\.meta4$|\.metalink$/) || filename.match(/\.torrent$|\.meta4$|\.metalink$/)) {
    return captureTorrentFromURL(aria2, server, url, directory, filename);
  }
  return captureURL(aria2, server, url, referer, cookies, directory, filename);
}

async function removeDownloadItemCompletely(downloadItem: Downloads.DownloadItem) {
  try {
    await browser.downloads.cancel(downloadItem.id);
  } catch {
    await browser.downloads.removeFile(downloadItem.id);
  } finally {
    await browser.downloads.erase({ id: downloadItem.id });
  }
}

async function handleDownload(downloadItem: Downloads.DownloadItem, handler: (connection: Aria2, server: Server, referer: string, cookies: string) => void) {
  const extensionOptions = await ExtensionOptions.fromStorage();
  if (extensionOptions.captureDownloads && connections[extensionOptions.captureServer] !== undefined) {
    const connection = connections[extensionOptions.captureServer];
    const server = extensionOptions.servers[extensionOptions.captureServer];
    let referrer = downloadItem.referrer ?? "";
    const currentTab = await findCurrentTab();
    if (referrer === "" || referrer === "about:blank") {
      referrer = currentTab?.url ?? "";
    }
    const cookies = await getCookies(referrer, currentTab?.cookieStoreId);
    if (downloadItemMustBeCaptured(extensionOptions, downloadItem, referrer)) {
      handler(connection, server, referrer, cookies);
    }
  }
}

if (isChromium()) {
  browser.downloads.onChanged.addListener(async (downloadDelta: Downloads.OnChangedDownloadDeltaType) => {
    const downloadItem = downloadItems[downloadDelta.id];
    if (downloadItem.id in downloadItems && downloadDelta.filename?.previous === "" && downloadDelta.filename.current) {
      const extensionOptions = await ExtensionOptions.fromStorage();
      downloadItem.filename = downloadDelta.filename.current;
      await handleDownload(downloadItem, async (connection, server, referrer, cookies) => {
        await removeDownloadItemCompletely(downloadItem);
        try {
          await captureDownloadItem(connection, server, downloadItem, referrer, cookies, extensionOptions.useCompleteFilePath);
          if (extensionOptions.notifyFileIsAdded) {
            await showNotification(i18n("addFileSuccess", server.name));
          }
        } catch {
          if (extensionOptions.notifyErrorOccurs) {
            await showNotification(i18n("addFileError", server.name));
          }
        }
        delete downloadItems[downloadItem.id];
      });
    }
  });
}

browser.downloads.onCreated.addListener(async (downloadItem) => {
  const extensionOptions = await ExtensionOptions.fromStorage();
  await handleDownload(downloadItem, async (connection, server, referrer, cookies) => {
    if (isFirefox()) {
      await removeDownloadItemCompletely(downloadItem);
      try {
        await captureDownloadItem(connection, server, downloadItem, referrer, cookies, extensionOptions.useCompleteFilePath);
        if (extensionOptions.notifyFileIsAdded) {
          await showNotification(i18n("addFileSuccess", server.name));
        }
      } catch {
        if (extensionOptions.notifyErrorOccurs) {
          await showNotification(i18n("addFileError", server.name));
        }
      }
    } else {
      downloadItems[downloadItem.id] = downloadItem;
    }
  });
});

browser.contextMenus.onClicked.addListener(listenerOnClicked);

export async function listenerOnClicked(info: Menus.OnClickData, tab?: Tabs.Tab) {
  const extensionOptions = await ExtensionOptions.fromStorage();
  const connection = connections[info.menuItemId];
  const server = extensionOptions.servers[info.menuItemId];

  const urls = getSelectedUrls(info);
  const referer = tab?.url ?? "";
  const cookies = await getCookies(referer, tab?.cookieStoreId);

  // Check if folder picker should be shown
  if (extensionOptions.askForFolderOnDownload) {
    // Store pending download info
    await browser.storage.local.set({
      pendingDownload: {
        serverId: info.menuItemId as string,
        urls,
        referer,
        cookies,
      },
    });

    // Open folder picker popup
    await browser.windows.create({
      url: browser.runtime.getURL("folder-picker/folder-picker.html"),
      type: "popup",
      width: 450,
      height: 420,
    });
    return;
  }

  // Direct download with optional default folder
  const directory = extensionOptions.defaultFolder || undefined;
  for (const url of urls) {
    captureURL(connection, server, url, referer, cookies, directory)
      .then(() => {
        if (extensionOptions.notifyUrlIsAdded) {
          showNotification(i18n("addUrlSuccess", server.name));
        }
      })
      .catch(() => {
        if (extensionOptions.notifyErrorOccurs) {
          showNotification(i18n("addUrlError", server.name));
        }
      });
  }
}

browser.commands.onCommand.addListener(listenerOnCommand);

export async function listenerOnCommand(command: string) {
  // As documented in https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/User_actions
  // It must always be first.
  // << Also, if a user input handler waits on a promise, then its status as a user input handler is lost. >>
  if (command === "open_popup") {
    await browser.action.openPopup();
  } else if (command === "toggle_capture_downloads") {
    const extensionOptions = await ExtensionOptions.fromStorage();
    const newCaptureDownloads = !extensionOptions.captureDownloads;
    let newCaptureServer = extensionOptions.captureServer;
    if (newCaptureServer === "") {
      const serverKeys = Object.keys(extensionOptions.servers);
      if (serverKeys.length === 0) {
        await showNotification(i18n("toggleCaptureDownloadsNoServer"));
        return;
      }
      [newCaptureServer] = serverKeys;
    }
    await new ExtensionOptions(
      extensionOptions.servers,
      newCaptureServer,
      newCaptureDownloads,
      extensionOptions.minFileSizeInBytes,
      extensionOptions.excludedProtocols,
      extensionOptions.excludedSites,
      extensionOptions.excludedFileTypes,
    ).toStorage();
    const message = newCaptureDownloads
      ? i18n("toggleCaptureDownloadsEnabled", extensionOptions.servers[newCaptureServer].name)
      : i18n("toggleCaptureDownloadsDisabled");
    await showNotification(message);
  }
}

browser.alarms.create(ALARM_NAME, {
  periodInMinutes: ALARM_INTERVAL_SECONDS / 60,
});

async function getGlobalStat(aria2server: any): Promise<GlobalStat> {
  const globalStat: unknown = await aria2server.call("getGlobalStat", [], {});
  return plainToInstance(GlobalStat, globalStat);
}

browser.alarms.onAlarm.addListener(listenerOnAlarm);

export async function listenerOnAlarm(alarm: browser.Alarms.Alarm) {
  if (alarm.name === ALARM_NAME) {
    const numActives = Object.values(connections).map(async (server) => {
      const globalStat = await getGlobalStat(server);
      return globalStat.numActive;
    });
    const totalActive = await Promise.all(numActives).then((n) => n.reduce((partialSum, a) => partialSum + a, 0));
    browser.action.setBadgeText({
      text: totalActive ? totalActive.toString(10) : "",
    });
    browser.action.setBadgeBackgroundColor({
      color: "#666666",
    });
  }
}
