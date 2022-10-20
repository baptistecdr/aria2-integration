// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Aria2 from "aria2";
import browser from "webextension-polyfill";
import type { Menus, Tabs, Cookies, Downloads } from "webextension-polyfill";
import { captureTorrentFromURL, captureURL, showNotification } from "../models/aria2-extension";
import ExtensionOptions from "../models/extension-options";
import basename from "../models/basename";
import Server from "../models/server";

const CONTEXT_MENUS_PARENT_ID = "aria2-integration";
let extensionOptions = await ExtensionOptions.fromStorage();

function createConnections() {
  const connections: Record<string, Aria2> = {};
  Object.entries(extensionOptions.servers).forEach(([key, server]) => {
    connections[key] = new Aria2(server);
  });
  return connections;
}

let connections: Record<string, Aria2> = createConnections();

async function createExtensionContextMenus() {
  await browser.contextMenus.removeAll();
  if (Object.keys(extensionOptions.servers).length > 0) {
    browser.contextMenus.create({
      title: browser.i18n.getMessage("contextMenusTitle"),
      id: CONTEXT_MENUS_PARENT_ID,
      contexts: ["link", "selection"],
    });
  }
}

async function createServersContextMenus() {
  Object.entries(extensionOptions.servers).forEach(([id, server]) => {
    browser.contextMenus.create({
      title: `${server.name}`,
      parentId: CONTEXT_MENUS_PARENT_ID,
      id,
      contexts: ["link", "selection"],
    });
  });
}

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await browser.runtime.openOptionsPage();
  }
});

await createExtensionContextMenus();
await createServersContextMenus();

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.options) {
    extensionOptions = await ExtensionOptions.fromStorage();
    await createExtensionContextMenus();
    await createServersContextMenus();
    connections = createConnections();
  }
});

function formatCookies(cookies: Cookies.Cookie[]) {
  return cookies.reduce((acc, cookie) => {
    return `${acc}${cookie.name}=${cookie.value};`;
  }, "");
}

async function getCookies(url: string): Promise<string> {
  if (url === "") {
    return "";
  }
  const cookies = await browser.cookies.getAll({ url });
  return formatCookies(cookies);
}

async function getCurrentTab(): Promise<Tabs.Tab | undefined> {
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

function downloadItemMustBeCaptured(item: Downloads.DownloadItem, referrer: string): boolean {
  if (extensionOptions.captureServer !== "") {
    const protocolsRegExp = new RegExp(`^${extensionOptions.excludedProtocols.map((p) => `(${p})`).join("|^")}`);
    const sitesRegExp = new RegExp(`${extensionOptions.excludedSites.map((s) => `(${s})`).join("|")}`);
    const fileTypesRegExp = new RegExp(`${extensionOptions.excludedFileTypes.join("$|")}$`);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const url = item.finalUrl ?? item.url; // finalUrl exists only on Chromium

    if (extensionOptions.excludedProtocols.length > 0 && protocolsRegExp.test(url)) {
      return false;
    }

    if (extensionOptions.excludedSites.length > 0 && (sitesRegExp.test(referrer) || sitesRegExp.test(url))) {
      return false;
    }

    return !(extensionOptions.excludedFileTypes.length > 0 && fileTypesRegExp.test(url));
  }
  return false;
}

async function captureDownloadItem(
  aria2: any,
  server: Server,
  item: Downloads.DownloadItem,
  referer: string,
  cookies: string
) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const url = item.finalUrl ?? item.url; // finalUrl (Chrome), url (Firefox)
  const filename = basename(item.filename);
  if (url.match(/\.torrent$|\.meta4$|\.metalink$/) || filename.match(/\.torrent$|\.meta4$|\.metalink$/)) {
    return captureTorrentFromURL(aria2, server, url, filename);
  }
  return captureURL(aria2, server, url, referer, cookies, filename);
}

browser.downloads.onCreated.addListener(async (downloadItem) => {
  if (extensionOptions.captureDownloads && connections[extensionOptions.captureServer] !== undefined) {
    const connection = connections[extensionOptions.captureServer];
    const server = extensionOptions.servers[extensionOptions.captureServer];
    let referrer = downloadItem.referrer ?? "";
    if (referrer === "" || referrer === "about:blank") {
      const currentTab = await getCurrentTab();
      referrer = currentTab?.url ?? "";
    }
    const cookies = await getCookies(referrer);
    if (downloadItemMustBeCaptured(downloadItem, referrer)) {
      try {
        await browser.downloads.cancel(downloadItem.id);
        await browser.downloads.erase({ id: downloadItem.id });
        await captureDownloadItem(connection, server, downloadItem, referrer, cookies);
        await showNotification(browser.i18n.getMessage("addFileSuccess", server.name));
      } catch {
        await showNotification(browser.i18n.getMessage("addFileError", server.name));
      }
    }
  }
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const connection = connections[info.menuItemId];
  const server = extensionOptions.servers[info.menuItemId];

  const urls = getSelectedUrls(info);
  const referer = tab?.url ?? "";
  const cookies = await getCookies(referer);
  urls.forEach((url) => {
    captureURL(connection, server, url, referer, cookies)
      .then(() => {
        showNotification(browser.i18n.getMessage("addUrlSuccess", server.name));
      })
      .catch(() => {
        showNotification(browser.i18n.getMessage("addUrlError", server.name));
      });
  });
});
