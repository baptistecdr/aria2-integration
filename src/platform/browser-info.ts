import browser from "webextension-polyfill";

export function isFirefox() {
  return !isChromium();
}

export function isChromium() {
  // @ts-expect-error Only available on Chromium
  return browser.downloads.onDeterminingFilename !== undefined;
}

export async function isOsAndroid(): Promise<boolean> {
  const platform = await browser.runtime.getPlatformInfo();
  return platform.os === "android";
}
