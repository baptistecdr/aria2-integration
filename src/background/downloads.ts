import type Aria2 from "@baptistecdr/aria2";
import browser, { type Downloads } from "webextension-polyfill";
import type { BackgroundContext } from "@/background/context";
import type { ExtensionOptions } from "@/domain/extension-options";
import { basename, dirname } from "@/domain/paths";
import type { Server } from "@/domain/server";
import { isChromium } from "@/platform/browser-info";
import { getCookies } from "@/platform/cookies";
import i18n from "@/platform/i18n";
import { findCurrentTab } from "@/platform/tabs";
import { captureTorrentFromURL, captureURL } from "@/services/capture";
import { runWithNotification } from "@/services/notify";

export function downloadItemMustBeCaptured(extensionOptions: ExtensionOptions, item: Downloads.DownloadItem, referrer: string): boolean {
  if (extensionOptions.captureServer !== "") {
    let excludedProtocols = extensionOptions.excludedProtocols.map((p) => `${p}:`);
    excludedProtocols.push("blob:", "data:", "file:");
    excludedProtocols = [...new Set(excludedProtocols)];
    // File types are compared as plain suffixes: they come from the user and must not be interpreted as regular expressions.
    const hasExcludedFileType = (path: string) => extensionOptions.excludedFileTypes.some((fileType) => path.endsWith(fileType));

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

    return !(hasExcludedFileType(url.pathname) || (refererURL !== null && hasExcludedFileType(refererURL.pathname)) || hasExcludedFileType(item.filename));
  }
  return false;
}

export async function captureDownloadItem(
  aria2: Aria2,
  server: Server,
  item: Downloads.DownloadItem,
  referer: string,
  cookies: string,
  useCompleteFilePath: boolean,
  isInIncognitoMode: boolean,
) {
  // @ts-expect-error finalUrl exists only on Chromium
  const url = item.finalUrl ?? item.url;
  const directory = useCompleteFilePath ? dirname(item.filename) : undefined;
  const filename = basename(item.filename);
  if (url.match(/\.torrent$|\.meta4$|\.metalink$/) || filename.match(/\.torrent$|\.meta4$|\.metalink$/)) {
    return captureTorrentFromURL(aria2, server, url, isInIncognitoMode, directory, filename);
  }
  return captureURL(aria2, server, url, referer, cookies, isInIncognitoMode, directory, filename);
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

export function createDownloadHandlers({ store, connections }: BackgroundContext) {
  // Chromium downloads waiting for their filename.
  const pendingDownloads = new Map<number, Downloads.DownloadItem>();

  // Sends the download to aria2 instead of the browser when the options say so.
  async function captureIfNeeded(downloadItem: Downloads.DownloadItem) {
    const options = await store.ready();
    const server = options.servers[options.captureServer];
    const connection = connections.get(options.captureServer);
    if (!options.captureDownloads || server === undefined || connection === undefined) {
      return;
    }
    const currentTab = await findCurrentTab();
    let referrer = downloadItem.referrer ?? "";
    if (referrer === "" || referrer === "about:blank") {
      referrer = currentTab?.url ?? "";
    }
    // @ts-expect-error finalUrl exists only on Chromium
    const downloadUrl = downloadItem.finalUrl ?? downloadItem.url;
    const cookies = await getCookies(downloadUrl, currentTab?.cookieStoreId);
    if (!downloadItemMustBeCaptured(options, downloadItem, referrer)) {
      return;
    }
    await removeDownloadItemCompletely(downloadItem);
    await runWithNotification(
      () => captureDownloadItem(connection, server, downloadItem, referrer, cookies, options.useCompleteFilePath, !!currentTab?.incognito),
      {
        success: options.notifyFileIsAdded ? i18n("addFileSuccess", server.name) : undefined,
        error: options.notifyErrorOccurs ? i18n("addFileError", server.name) : undefined,
      },
    );
  }

  return {
    async onCreated(downloadItem: Downloads.DownloadItem) {
      if (isChromium()) {
        // Chromium only knows the filename once onChanged fires, which can happen before any awaited call here resolves:
        // track the item right away and let onChanged decide whether to capture it.
        pendingDownloads.set(downloadItem.id, downloadItem);
        return;
      }
      await captureIfNeeded(downloadItem);
    },

    async onChanged(downloadDelta: Downloads.OnChangedDownloadDeltaType) {
      const downloadItem = pendingDownloads.get(downloadDelta.id);
      if (downloadItem === undefined) {
        return;
      }
      if (downloadDelta.filename?.previous === "" && downloadDelta.filename.current) {
        pendingDownloads.delete(downloadDelta.id);
        await captureIfNeeded({ ...downloadItem, filename: downloadDelta.filename.current });
      } else if (downloadDelta.state?.current === "complete" || downloadDelta.state?.current === "interrupted") {
        // Forget the downloads that ended without ever getting a filename.
        pendingDownloads.delete(downloadDelta.id);
      }
    },
  };
}
