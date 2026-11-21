import browser from "webextension-polyfill";
import type { BackgroundContext } from "@/background/context";
import { ExtensionOptions } from "@/domain/extension-options";
import i18n from "@/platform/i18n";
import { showNotification } from "@/platform/notifications";

export const OPEN_POPUP_COMMAND = "open_popup";
export const TOGGLE_CAPTURE_DOWNLOADS_COMMAND = "toggle_capture_downloads";

export function createCommandHandler({ store }: BackgroundContext) {
  return async (command: string) => {
    // As documented in https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/User_actions
    // It must always be first.
    // << Also, if a user input handler waits on a promise, then its status as a user input handler is lost. >>
    if (command === OPEN_POPUP_COMMAND) {
      await browser.action.openPopup();
    } else if (command === TOGGLE_CAPTURE_DOWNLOADS_COMMAND) {
      await toggleCaptureDownloads(store);
    }
  };
}

async function toggleCaptureDownloads(store: BackgroundContext["store"]) {
  let hasServer = true;
  // The toggle is computed from the latest stored options, so it can't undo a change made meanwhile on another page.
  const options = await store.update((current) => {
    const captureServer = current.captureServer !== "" ? current.captureServer : (Object.keys(current.servers)[0] ?? "");
    if (captureServer === "") {
      hasServer = false;
      return current;
    }
    return ExtensionOptions.withOverrides(current, { captureServer, captureDownloads: !current.captureDownloads });
  });
  if (!hasServer) {
    await showNotification(i18n("toggleCaptureDownloadsNoServer"));
  } else if (options.captureDownloads) {
    await showNotification(i18n("toggleCaptureDownloadsEnabled", options.servers[options.captureServer].name));
  } else {
    await showNotification(i18n("toggleCaptureDownloadsDisabled"));
  }
}
