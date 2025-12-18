import browser, { type Notifications } from "webextension-polyfill";
import type Server from "@/models/server";

export function isFirefox() {
  // @ts-expect-error Only available on Chromium
  return browser.downloads.onDeterminingFilename === undefined;
}

export function encodeFileToBase64(file: File | Blob) {
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

export async function showNotification(message: string) {
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

export async function captureTorrentFromFile(aria2: any, server: Server, file: File) {
  const blobAsBase64 = await encodeFileToBase64(file);
  if (file.name.endsWith("torrent")) {
    return aria2.call("aria2.addTorrent", blobAsBase64, [], server.rpcParameters);
  }
  return aria2.call("aria2.addMetalink", blobAsBase64, [], server.rpcParameters);
}

export async function captureTorrentFromURL(aria2: any, server: Server, url: string, directory?: string, filename?: string) {
  const blob = await download(url);
  const blobAsBase64 = await encodeFileToBase64(blob);
  const aria2Parameters: any = {
    ...server.rpcParameters,
  };
  if (directory) {
    aria2Parameters.dir = directory;
  }
  if (url.endsWith(".torrent") || filename?.endsWith(".torrent")) {
    return aria2.call("aria2.addTorrent", blobAsBase64, [], aria2Parameters);
  }
  return aria2.call("aria2.addMetalink", blobAsBase64, [], aria2Parameters);
}

export async function captureURL(aria2: any, server: Server, url: string, referer: string, cookies: string, directory?: string, filename?: string) {
  if (url.match(/\.torrent$|\.meta4$|\.metalink$/)) {
    return captureTorrentFromURL(aria2, server, url, directory, filename);
  }
  const aria2Parameters: any = {
    header: [`Referer: ${referer}`, `Cookie: ${cookies}`],
    ...server.rpcParameters,
  };
  if (directory) {
    aria2Parameters.dir = directory;
  }
  if (filename) {
    aria2Parameters.out = filename;
  }
  return aria2.call("aria2.addUri", [url], aria2Parameters);
}
