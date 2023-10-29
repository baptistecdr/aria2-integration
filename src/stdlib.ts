import reBasenameWindows from "@stdlib/regexp-basename-windows";
import reBasenamePosix from "@stdlib/regexp-basename-posix";
import browser from "webextension-polyfill";
import reDirnameWindows from "@stdlib/regexp-dirname-windows";
import reDirnamePosix from "@stdlib/regexp-dirname-posix";

export async function basename(filename: string): Promise<string> {
  const isWin = (await browser.runtime.getPlatformInfo()).os === "win";
  const result = isWin ? reBasenameWindows().exec(filename) : reBasenamePosix().exec(filename);
  if (result === null || result.length !== 2) {
    return filename;
  }
  return result[1];
}

export async function dirname(filename: string): Promise<string> {
  const isWin = (await browser.runtime.getPlatformInfo()).os === "win";
  const result = isWin ? reDirnameWindows().exec(filename) : reDirnamePosix().exec(filename);
  if (result === null || result.length !== 2) {
    return filename;
  }
  return result[1];
}
