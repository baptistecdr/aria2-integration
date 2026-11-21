import browser from "webextension-polyfill";
import type { BackgroundContext } from "@/background/context";
import { ExtensionOptions } from "@/domain/extension-options";
import i18n from "@/platform/i18n";
import { showNotification } from "@/platform/notifications";
import { CaptureServerMissingError } from "@/services/options-store";

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
  await store.ready();
  if (store.managed().has("captureDownloads")) {
    // The policy would override the toggle. A capture server set by the policy is fine: it is the one used.
    await showNotification(i18n("toggleCaptureDownloadsManaged"));
    return;
  }
  let options: ExtensionOptions;
  try {
    // The toggle is computed from the latest stored options, so it can't undo a change made meanwhile on another page.
    options = await store.update((current) => {
      const captureServer = current.captureServer !== "" ? current.captureServer : (Object.keys(current.servers)[0] ?? "");
      return ExtensionOptions.withOverrides(current, { captureServer, captureDownloads: !current.captureDownloads });
    });
  } catch (error) {
    // No server at all, or the policy sets a capture server that does not exist.
    if (error instanceof CaptureServerMissingError) {
      await showNotification(i18n("toggleCaptureDownloadsNoServer"));
      return;
    }
    throw error;
  }
  if (options.captureDownloads) {
    await showNotification(i18n("toggleCaptureDownloadsEnabled", options.servers[options.captureServer].name));
  } else {
    await showNotification(i18n("toggleCaptureDownloadsDisabled"));
  }
}
