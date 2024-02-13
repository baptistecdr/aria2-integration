import reBasenameWindows from "@stdlib/regexp-basename-windows";
import reBasenamePosix from "@stdlib/regexp-basename-posix";
import reDirnameWindows from "@stdlib/regexp-dirname-windows";
import reDirnamePosix from "@stdlib/regexp-dirname-posix";

function isWindowsPath(filepath: string): boolean {
  const windowsPathRegex = /^[a-zA-Z]:\\/;
  return windowsPathRegex.test(filepath);
}

export function basename(filepath: string): string {
  const result = isWindowsPath(filepath) ? reBasenameWindows().exec(filepath) : reBasenamePosix().exec(filepath);
  if (result === null || result.length !== 2) {
    return filepath;
  }
  return result[1];
}

export function dirname(filepath: string): string {
  const result = isWindowsPath(filepath) ? reDirnameWindows().exec(filepath) : reDirnamePosix().exec(filepath);
  if (result === null || result.length !== 2) {
    return filepath;
  }
  return result[1];
}
