import type { Downloads } from "webextension-polyfill";
import type { DownloadCapturer } from "@/background/download-capture";
import type { DownloadInterceptor } from "@/background/download-interceptors";

// finalUrl is the URL after redirects. It only exists on Chromium, so it's missing from the WebExtension types.
type ChromiumDownloadItem = Downloads.DownloadItem & { finalUrl?: string };

// Chromium only knows the filename once onChanged reports it, which can happen before anything awaited in onCreated
// resolves: downloads are tracked right away and captured when their filename is known.
export function createChromiumDownloadInterceptor(capture: DownloadCapturer): DownloadInterceptor {
  const pendingDownloads = new Map<number, ChromiumDownloadItem>();

  const onCreated = (item: ChromiumDownloadItem) => {
    pendingDownloads.set(item.id, item);
  };

  const onChanged = async (delta: Downloads.OnChangedDownloadDeltaType) => {
    const item = pendingDownloads.get(delta.id);
    if (item === undefined) {
      // onChanged fires for every download, including the ones created before the background script started.
      return;
    }
    if (delta.filename?.previous === "" && delta.filename.current) {
      pendingDownloads.delete(delta.id);
      await capture({ id: item.id, url: item.finalUrl ?? item.url, filename: delta.filename.current, totalBytes: item.totalBytes, referrer: item.referrer });
    } else if (delta.state?.current === "complete" || delta.state?.current === "interrupted") {
      // Forget the downloads that ended without ever getting a filename.
      pendingDownloads.delete(delta.id);
    }
  };

  return {
    listen(downloads) {
      downloads.onCreated.addListener(onCreated);
      downloads.onChanged.addListener(onChanged);
    },
  };
}
