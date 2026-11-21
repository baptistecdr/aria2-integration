import type { Downloads } from "webextension-polyfill";
import type { DownloadCapturer } from "@/background/download-capture";
import { createChromiumDownloadInterceptor } from "@/background/download-interceptors/chromium";
import { createFirefoxDownloadInterceptor } from "@/background/download-interceptors/firefox";
import { isChromium } from "@/platform/browser-info";

// How a browser reports downloads: each browser needs its own strategy to get a download's filename before capturing it.
export interface DownloadInterceptor {
  // Registers the download listeners. Must be called synchronously when the background script starts.
  listen(downloads: Downloads.Static): void;
}

export function createDownloadInterceptor(capture: DownloadCapturer): DownloadInterceptor {
  return isChromium() ? createChromiumDownloadInterceptor(capture) : createFirefoxDownloadInterceptor(capture);
}
