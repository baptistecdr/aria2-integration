import type { Downloads } from "webextension-polyfill";
import type { DownloadCapturer } from "@/background/download-capture";
import type { DownloadInterceptor } from "@/background/download-interceptors";

// Firefox knows the filename when the download is created.
export function createFirefoxDownloadInterceptor(capture: DownloadCapturer): DownloadInterceptor {
  const onCreated = (item: Downloads.DownloadItem) =>
    capture({ id: item.id, url: item.url, filename: item.filename, totalBytes: item.totalBytes, referrer: item.referrer });
  return {
    listen(downloads) {
      downloads.onCreated.addListener(onCreated);
    },
  };
}
