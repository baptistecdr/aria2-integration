import browser from "webextension-polyfill";
import type { BackgroundContext } from "@/background/context";
import { type DownloadCandidate, shouldCaptureDownload } from "@/domain/capture-rules";
import { basename, dirname } from "@/domain/paths";
import { getCookies } from "@/platform/cookies";
import i18n from "@/platform/i18n";
import { findCurrentTab } from "@/platform/tabs";
import { captureUrl } from "@/services/capture";
import { runWithNotification } from "@/services/notify";

// A browser download, once the browser knows its filename.
export interface BrowserDownload extends DownloadCandidate {
  id: number;
  // The page that started the download, when the browser tells it.
  referrer?: string;
}

export type DownloadCapturer = (download: BrowserDownload) => Promise<void>;

async function removeBrowserDownload(id: number) {
  try {
    await browser.downloads.cancel(id);
  } catch {
    await browser.downloads.removeFile(id);
  } finally {
    await browser.downloads.erase({ id });
  }
}

// Sends the download to aria2 instead of the browser when the options say so.
export function createDownloadCapturer({ store, connections }: BackgroundContext): DownloadCapturer {
  return async (download) => {
    const options = await store.ready();
    const server = options.servers[options.captureServer];
    const connection = connections.get(options.captureServer);
    if (!options.captureDownloads || server === undefined || connection === undefined) {
      return;
    }
    const currentTab = await findCurrentTab();
    const referrer = download.referrer && download.referrer !== "about:blank" ? download.referrer : (currentTab?.url ?? "");
    if (!shouldCaptureDownload(options, download, referrer)) {
      return;
    }
    const cookies = await getCookies(download.url, currentTab?.cookieStoreId);
    await removeBrowserDownload(download.id);
    const request = {
      url: download.url,
      referer: referrer,
      cookies,
      incognito: !!currentTab?.incognito,
      directory: options.useCompleteFilePath ? dirname(download.filename) : undefined,
      filename: basename(download.filename),
    };
    await runWithNotification(() => captureUrl(connection, server, request), {
      success: options.notifyFileIsAdded ? i18n("addFileSuccess", server.name) : undefined,
      error: options.notifyErrorOccurs ? i18n("addFileError", server.name) : undefined,
    });
  };
}
