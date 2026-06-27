import type Aria2 from "@baptistecdr/aria2";
import browser, { type Notifications } from "webextension-polyfill";
import type Server from "@/models/server";
import { EXCLUDED_PROTOCOLS, SUPPORTED_TORRENT_EXTENSIONS } from "@/constants";

/**
 * Represents the parameters for Aria2 RPC calls.
 * Standardizes types for headers, paths, and additional RPC parameters.
 */
export interface Aria2Parameters {
  header?: string[];
  dir?: string;
  out?: string;
  [key: string]: string | string[] | undefined;
}

export function isFirefox(): boolean {
  return !isChromium();
}

export function isChromium(): boolean {
  // @ts-expect-error Only available on Chromium
  return browser.downloads.onDeterminingFilename !== undefined;
}

export async function isOsAndroid(): Promise<boolean> {
  const platform = await browser.runtime.getPlatformInfo();
  return platform.os === "android";
}

export function encodeFileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const temporaryFileReader = new FileReader();
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new Error(`Cannot parse '${file}'.`));
    };
    temporaryFileReader.onloadend = () => {
      if (temporaryFileReader.result) {
        const splitResult = temporaryFileReader.result.toString().split(/[:;,]/);
        if (splitResult.length >= 4) {
          resolve(splitResult[3]);
        } else {
          reject(new Error(`Cannot get base64 encoded string for '${file}'.`));
        }
      } else {
        reject(new Error(`Result is empty for '${file}'.`));
      }
    };
    temporaryFileReader.readAsDataURL(file);
  });
}

export async function showNotification(message: string): Promise<void> {
  const options: Notifications.CreateNotificationOptions = {
    type: "basic",
    title: "Aria2",
    iconUrl: "../icons/icon-browser-80.png",
    message,
  };
  await browser.notifications.create(undefined, options);
}

export async function download(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}

export async function captureTorrentFromFile(
  aria2: Aria2,
  server: Server,
  file: File,
  isInIncognitoMode: boolean
): Promise<any> {
  const blobAsBase64 = await encodeFileToBase64(file);
  const aria2Parameters: Aria2Parameters = {
    ...(server.incognitoModeOptions?.overwriteRpcParameters && isInIncognitoMode 
      ? server.incognitoModeOptions.rpcParameters 
      : server.rpcParameters),
  };

  if (file.name.endsWith("torrent")) {
    return aria2.call("aria2.addTorrent", blobAsBase64, [], aria2Parameters);
  }
  return aria2.call("aria2.addMetalink", blobAsBase64, [], aria2Parameters);
}

/**
 * Determines if a URL or filename belongs to a torrent, meta4, or metalink.
 */
export function isTorrentOrMetalink(url: string, filename?: string): boolean {
  const regex = new RegExp(SUPPORTED_TORRENT_EXTENSIONS.map(ext => `\\.${ext}$`).join("|"));
  return url.match(regex) !== null || (filename && filename.match(regex) !== null);
}

export async function captureTorrentFromURL(
  aria2: Aria2,
  server: Server,
  url: string,
  isInIncognitoMode: boolean,
  directory?: string,
  filename?: string
): Promise<any> {
  if (!isTorrentOrMetalink(url, filename)) {
    return;
  }

  const blob = await download(url);
  const blobAsBase64 = await encodeFileToBase64(blob);
  const aria2Parameters: Aria2Parameters = {
    ...(server.incognitoModeOptions?.overwriteRpcParameters && isInIncognitoMode 
      ? server.incognitoModeOptions.rpcParameters 
      : server.rpcParameters),
  };

  if (directory) {
    aria2Parameters.dir = directory;
  }

  if (url.endsWith(".torrent") || filename?.endsWith(".torrent")) {
    return aria2.call("aria2.addTorrent", blobAsBase64, [], aria2Parameters);
  }
  return aria2.call("aria2.addMetalink", blobAsBase64, [], aria2Parameters);
}

export async function captureURL(
  aria2: Aria2,
  server: Server,
  url: string,
  referer: string,
  cookies: string,
  isInIncognitoMode: boolean,
  directory?: string,
  filename?: string,
): Promise<any> {
  if (isTorrentOrMetalink(url, filename)) {
    return captureTorrentFromURL(aria2, server, url, isInIncognitoMode, directory, filename);
  }

  const aria2Parameters: Aria2Parameters = {
    header: [`Referer: ${referer}`, `Cookie: ${cookies}`],
    ...(server.incognitoModeOptions?.overwriteRpcParameters && isInIncognitoMode 
      ? server.incognitoModeOptions.rpcParameters 
      : server.rpcParameters),
  };

  if (directory) {
    aria2Parameters.dir = directory;
  }
  if (filename) {
    aria2Parameters.out = filename;
  }

  return aria2.call("aria2.addUri", [url], aria2Parameters);
}
