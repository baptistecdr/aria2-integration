import type Aria2 from "@baptistecdr/aria2";
import type { Server } from "@/domain/server";
import { download, encodeFileToBase64 } from "@/platform/files";

export async function captureTorrentFromFile(aria2: Aria2, server: Server, file: File, isInIncognitoMode: boolean) {
  const blobAsBase64 = await encodeFileToBase64(file);
  const aria2Parameters: any = {
    ...(server.incognitoModeOptions?.overwriteRpcParameters && isInIncognitoMode ? server.incognitoModeOptions.rpcParameters : server.rpcParameters),
  };
  if (file.name.endsWith("torrent")) {
    return aria2.call("aria2.addTorrent", blobAsBase64, [], aria2Parameters);
  }
  return aria2.call("aria2.addMetalink", blobAsBase64, [], aria2Parameters);
}

export async function captureTorrentFromURL(aria2: Aria2, server: Server, url: string, isInIncognitoMode: boolean, directory?: string, filename?: string) {
  const blob = await download(url);
  const blobAsBase64 = await encodeFileToBase64(blob);
  const aria2Parameters: any = {
    ...(server.incognitoModeOptions?.overwriteRpcParameters && isInIncognitoMode ? server.incognitoModeOptions.rpcParameters : server.rpcParameters),
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
) {
  if (url.match(/\.torrent$|\.meta4$|\.metalink$/)) {
    return captureTorrentFromURL(aria2, server, url, isInIncognitoMode, directory, filename);
  }
  const aria2Parameters: any = {
    header: [`Referer: ${referer}`, `Cookie: ${cookies}`],
    ...(server.incognitoModeOptions?.overwriteRpcParameters && isInIncognitoMode ? server.incognitoModeOptions.rpcParameters : server.rpcParameters),
  };

  if (directory) {
    aria2Parameters.dir = directory;
  }
  if (filename) {
    aria2Parameters.out = filename;
  }
  return aria2.call("aria2.addUri", [url], aria2Parameters);
}
