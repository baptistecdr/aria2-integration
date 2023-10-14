import reBasenameWindows from "@stdlib/regexp-basename-windows";
import reBasenamePosix from "@stdlib/regexp-basename-posix";
import browser from "webextension-polyfill";

export default async function basename(filename: string): Promise<string> {
  const isWin = (await browser.runtime.getPlatformInfo()).os === "win";
  const result = isWin ? reBasenameWindows().exec(filename) : reBasenamePosix().exec(filename);
  if (result === null || result.length !== 2) {
    return filename;
  }
  return result[1];
}
