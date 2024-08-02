import ExtensionOptions from "@/models/extension-options";
import type Server from "@/models/server";
import GlobalStat from "@/popup/models/global-stat";
import { basename, dirname } from "@/stdlib";
// @ts-expect-error No type information for aria2
import Aria2 from "aria2";
import { plainToInstance } from "class-transformer";
import type { Cookies, Downloads, Menus, Tabs } from "webextension-polyfill";
import browser from "webextension-polyfill";
import { captureTorrentFromURL, captureURL, showNotification } from "../models/aria2-extension";

const CONTEXT_MENUS_PARENT_ID = "aria2-integration";
const ALARM_NAME = "set-badge";
const ALARM_INTERVAL_SECONDS = 5;

let connections: Record<string, Aria2> = {};

function createConnections(extensionOptions: ExtensionOptions) {
  const conns: Record<string, Aria2> = {};
  for (const [key, server] of Object.entries(extensionOptions.servers)) {
    conns[key] = new Aria2(server);
  }
  return conns;
}

async function createExtensionContextMenus(extensionOptions: ExtensionOptions) {
  await browser.contextMenus.removeAll();
  if (Object.keys(extensionOptions.servers).length > 0) {
    browser.contextMenus.create({
      title: browser.i18n.getMessage("contextMenusTitle"),
      id: CONTEXT_MENUS_PARENT_ID,
      contexts: ["link", "selection"],
    });
  }
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
      title: browser.i18n.getMessage("contextMenusTitle"),
      id,
      contexts: ["link", "selection"],
    });
  }
}

async function createContextMenus(extensionOptions: ExtensionOptions) {
  if (Object.keys(extensionOptions.servers).length === 1) {
    await createSingleServerContextMenus(extensionOptions);
  } else if (Object.keys(extensionOptions.servers).length > 1) {
    await createExtensionContextMenus(extensionOptions);
    await createServersContextMenus(extensionOptions);
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

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.options) {
    const extensionOptions = await ExtensionOptions.fromStorage();
    connections = createConnections(extensionOptions);
    await createContextMenus(extensionOptions);
  }
});

function formatCookies(cookies: Cookies.Cookie[]) {
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

function getSelectedUrls(onClickData: Menus.OnClickData): string[] {
  if (onClickData.linkUrl) {
    return [onClickData.linkUrl];
  }
  if (onClickData.selectionText) {
    return onClickData.selectionText.split(/\s+/);
  }
  return [];
}

function downloadItemMustBeCaptured(extensionOptions: ExtensionOptions, item: Downloads.DownloadItem, referrer: string): boolean {
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

async function captureDownloadItem(aria2: any, server: Server, item: Downloads.DownloadItem, referer: string, cookies: string, useCompleteFilePath: boolean) {
  // @ts-expect-error finalUrl exists only on Chromium
  const url = item.finalUrl ?? item.url;
  const directory = useCompleteFilePath ? dirname(item.filename) : undefined;
  const filename = basename(item.filename);
  if (url.match(/\.torrent$|\.meta4$|\.metalink$/) || filename.match(/\.torrent$|\.meta4$|\.metalink$/)) {
    return captureTorrentFromURL(aria2, server, url, directory, filename);
  }
  return captureURL(aria2, server, url, referer, cookies, directory, filename);
}

browser.downloads.onCreated.addListener(async (downloadItem) => {
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
      try {
        await browser.downloads.cancel(downloadItem.id);
      } catch {
        await browser.downloads.removeFile(downloadItem.id);
      } finally {
        await browser.downloads.erase({ id: downloadItem.id });
      }
      try {
        await captureDownloadItem(connection, server, downloadItem, referrer, cookies, extensionOptions.useCompleteFilePath);
        await showNotification(browser.i18n.getMessage("addFileSuccess", server.name));
      } catch {
        await showNotification(browser.i18n.getMessage("addFileError", server.name));
      }
    }
  }
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const extensionOptions = await ExtensionOptions.fromStorage();
  const connection = connections[info.menuItemId];
  const server = extensionOptions.servers[info.menuItemId];

  const urls = getSelectedUrls(info);
  const referer = tab?.url ?? "";
  const cookies = await getCookies(referer, tab?.cookieStoreId);
  for (const url of urls) {
    captureURL(connection, server, url, referer, cookies)
      .then(() => {
        showNotification(browser.i18n.getMessage("addUrlSuccess", server.name));
      })
      .catch(() => {
        showNotification(browser.i18n.getMessage("addUrlError", server.name));
      });
  }
});

browser.commands.onCommand.addListener(async (command) => {
  const extensionOptions = await ExtensionOptions.fromStorage();
  if (command === "toggle_capture_downloads") {
    const newCaptureDownloads = !extensionOptions.captureDownloads;
    let newCaptureServer = extensionOptions.captureServer;
    if (newCaptureServer === "") {
      const serverKeys = Object.keys(extensionOptions.servers);
      if (serverKeys.length === 0) {
        await showNotification(browser.i18n.getMessage("toggleCaptureDownloadsNoServer"));
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
      ? browser.i18n.getMessage("toggleCaptureDownloadsEnabled", extensionOptions.servers[newCaptureServer].name)
      : browser.i18n.getMessage("toggleCaptureDownloadsDisabled");
    await showNotification(message);
  }
});

browser.alarms.create(ALARM_NAME, {
  periodInMinutes: ALARM_INTERVAL_SECONDS / 60,
});

async function getGlobalStat(aria2server: any): Promise<GlobalStat> {
  const globalStat: unknown = await aria2server.call("getGlobalStat", [], {});
  return plainToInstance(GlobalStat, globalStat);
}

browser.alarms.onAlarm.addListener(async (alarmInfo) => {
  if (alarmInfo.name === ALARM_NAME) {
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
});
