import type { ExtensionOptions } from "@/domain/extension-options";

// Protocols aria2 can't download from, whatever the options say.
const ALWAYS_EXCLUDED_PROTOCOLS = ["blob:", "data:", "file:"];
const TORRENT_LIKE = /\.(torrent|meta4|metalink)$/;

// A browser download, as seen by the capture rules.
export interface DownloadCandidate {
  // The URL the file is downloaded from, after redirects when the browser tells it.
  url: string;
  filename: string;
  // -1 when unknown.
  totalBytes: number;
}

// Whether aria2 should add the file as a torrent or a metalink instead of downloading it.
export function isTorrentLike(urlOrFilename: string | undefined): boolean {
  return urlOrFilename !== undefined && TORRENT_LIKE.test(urlOrFilename);
}

// Whether the download must be sent to aria2 instead of the browser. The referrer is the page that started it, or "".
export function shouldCaptureDownload(options: ExtensionOptions, download: DownloadCandidate, referrer: string): boolean {
  if (!options.captureDownloads || options.captureServer === "") {
    return false;
  }
  const url = new URL(download.url);
  const refererURL = referrer !== "" ? new URL(referrer) : null;
  const excludedProtocols = new Set([...options.excludedProtocols.map((protocol) => `${protocol}:`), ...ALWAYS_EXCLUDED_PROTOCOLS]);
  // Sites are keywords ("microsoft, google.com"): any hostname containing one is excluded.
  const isExcludedSite = (hostname: string) => options.excludedSites.some((site) => hostname.includes(site));
  // File types are compared as plain suffixes: they come from the user and must not be interpreted as regular expressions.
  const hasExcludedFileType = (path: string) => options.excludedFileTypes.some((fileType) => path.endsWith(fileType));

  if (download.totalBytes !== -1 && download.totalBytes < options.minFileSizeInBytes) {
    return false;
  }
  if (excludedProtocols.has(url.protocol)) {
    return false;
  }
  if (isExcludedSite(url.hostname) || (refererURL !== null && isExcludedSite(refererURL.hostname))) {
    return false;
  }
  return !(hasExcludedFileType(url.pathname) || (refererURL !== null && hasExcludedFileType(refererURL.pathname)) || hasExcludedFileType(download.filename));
}
