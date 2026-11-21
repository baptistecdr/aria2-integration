import { isTorrentLike } from "@/domain/capture-rules";
import type { Server } from "@/domain/server";
import { download, encodeFileToBase64 } from "@/platform/files";
import type { Aria2Client, Aria2Parameters } from "@/services/aria2-client";

// A file to download with aria2.
export interface CaptureRequest {
  url: string;
  // Whether the request comes from a private window: some servers use other parameters in that case.
  incognito: boolean;
  // Sent to the server hosting the file, so that downloads needing a session keep working.
  referer?: string;
  cookies?: string;
  // Where aria2 saves the file. Defaults to the server's settings.
  directory?: string;
  filename?: string;
}

// The aria2 parameters of the server, which can be replaced in private windows.
export function serverParameters(server: Server, incognito: boolean): Aria2Parameters {
  const { incognitoModeOptions } = server;
  return { ...(incognito && incognitoModeOptions?.overwriteRpcParameters ? incognitoModeOptions.rpcParameters : server.rpcParameters) };
}

function addTorrentOrMetalink(aria2: Aria2Client, base64: string, isTorrent: boolean, parameters: Aria2Parameters) {
  return isTorrent ? aria2.addTorrent(base64, parameters) : aria2.addMetalink(base64, parameters);
}

// Adds a .torrent or metalink file chosen by the user.
export async function captureTorrentFile(aria2: Aria2Client, server: Server, file: File, incognito: boolean) {
  const base64 = await encodeFileToBase64(file);
  return addTorrentOrMetalink(aria2, base64, file.name.endsWith("torrent"), serverParameters(server, incognito));
}

// Downloads the .torrent or metalink file and adds it, so that aria2 downloads its content.
export async function captureTorrentFromUrl(aria2: Aria2Client, server: Server, request: CaptureRequest) {
  const base64 = await encodeFileToBase64(await download(request.url));
  const parameters = serverParameters(server, request.incognito);
  if (request.directory) {
    parameters.dir = request.directory;
  }
  const isTorrent = request.url.endsWith(".torrent") || !!request.filename?.endsWith(".torrent");
  return addTorrentOrMetalink(aria2, base64, isTorrent, parameters);
}

// Sends the file to aria2. Torrents and metalinks are added so that aria2 downloads their content.
export async function captureUrl(aria2: Aria2Client, server: Server, request: CaptureRequest) {
  if (isTorrentLike(request.url) || isTorrentLike(request.filename)) {
    return captureTorrentFromUrl(aria2, server, request);
  }
  const parameters: Aria2Parameters = {
    header: [`Referer: ${request.referer ?? ""}`, `Cookie: ${request.cookies ?? ""}`],
    ...serverParameters(server, request.incognito),
  };
  if (request.directory) {
    parameters.dir = request.directory;
  }
  if (request.filename) {
    parameters.out = request.filename;
  }
  return aria2.addUri([request.url], parameters);
}
