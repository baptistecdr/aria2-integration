import { resolve } from "node:path";
import { test as base } from "@playwright/test";
import type { ExtensionOptions } from "@/domain/extension-options";
import type { Server } from "@/domain/server";
import { Aria2Daemon, FileServer } from "../fixtures";
import { Firefox } from "./firefox";

// Only available inside the extension pages, where the evaluated expressions run.
declare const browser: any;

// Built by `npm run build:firefox:e2e`.
const EXTENSION_PATH = resolve(import.meta.dirname, "..", "..", "dist-firefox");
const EXTENSION_ID = "baptistecdr@users.noreply.github.com";
const EXTENSION_UUID = "6b0d5a7e-3f1c-4c2a-9e8d-1a2b3c4d5e6f";
// Must match FILE_SERVER_HOST in ../fixtures.ts.
const FILE_SERVER_HOST = "host.docker.internal";
const EXTENSION_LOAD_TIMEOUT_MS = 10_000;

type OptionsInput = Omit<Partial<ExtensionOptions>, "servers"> & { servers?: Record<string, Partial<Server>> };

export class FirefoxExtension {
  constructor(
    readonly firefox: Firefox,
    // Where the pages of the tests are opened.
    readonly tab: string,
    // Where the extension pages are opened: navigating the page tab away would cancel the downloads it started.
    private readonly extensionTab: string,
    private readonly chromeWindow: string,
  ) {}

  url(path: string) {
    return `moz-extension://${EXTENSION_UUID}/${path}`;
  }

  // Opens the options page in the extension tab, where the WebExtension APIs of the extension are available.
  async openOptions() {
    // Right after install, the extension URL may not be served yet: retry until the page gets the extension APIs.
    const deadline = Date.now() + EXTENSION_LOAD_TIMEOUT_MS;
    for (;;) {
      await this.firefox.navigate(this.extensionTab, this.url("options/options.html"));
      if (await this.firefox.evaluate<boolean>(this.extensionTab, `typeof browser !== "undefined"`)) {
        return;
      }
      if (Date.now() > deadline) {
        throw new Error("The options page of the extension did not load");
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  async setOptions(options: OptionsInput) {
    await this.firefox.evaluate(this.extensionTab, `browser.storage.sync.set({ options: ${JSON.stringify(JSON.stringify(options))} }).then(() => true)`);
  }

  // The downloads the browser knows about, read from an extension page.
  async browserDownloads(): Promise<{ url: string; state: string }[]> {
    return this.firefox.evaluate(this.extensionTab, "browser.downloads.search({}).then((items) => items.map(({ url, state }) => ({ url, state })))");
  }

  // "running" or "stopped", see Extension.backgroundState in Firefox.
  backgroundState(): Promise<string> {
    return this.firefox.evaluate(this.chromeWindow, `WebExtensionPolicy.getByID("${EXTENSION_ID}").extension.backgroundState`);
  }

  // Stops the background script the way Firefox does when it is idle. Its persistent listeners stay registered and start
  // it again on their next event, like at browser startup.
  async stopBackground() {
    await this.firefox.evaluate(
      this.chromeWindow,
      `WebExtensionPolicy.getByID("${EXTENSION_ID}").extension.terminateBackground({ disableResetIdleForTest: true }).then(() => true)`,
    );
  }

  // Opens the page and clicks the element, like the user would.
  async click(url: string, selector: string) {
    await this.firefox.navigate(this.tab, url);
    await this.firefox.evaluate(this.tab, `document.querySelector(${JSON.stringify(selector)}).click()`);
  }
}

interface Fixtures {
  firefox: Firefox;
  extension: FirefoxExtension;
  aria2: Aria2Daemon;
  fileServer: FileServer;
}

export const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern
  firefox: async ({}, use) => {
    const firefox = await Firefox.launch({ extensionUuids: { [EXTENSION_ID]: EXTENSION_UUID }, localHosts: [FILE_SERVER_HOST] });
    await use(firefox);
    await firefox.close();
  },
  extension: async ({ firefox }, use) => {
    await firefox.installExtension(EXTENSION_PATH);
    const extension = new FirefoxExtension(firefox, await firefox.tab(), await firefox.newTab(), await firefox.chromeWindow());
    await extension.openOptions();
    await use(extension);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern
  aria2: async ({}, use) => {
    const aria2 = new Aria2Daemon();
    await aria2.reset();
    await use(aria2);
    await aria2.reset();
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern
  fileServer: async ({}, use) => {
    const fileServer = await FileServer.start();
    await use(fileServer);
    await fileServer.stop();
  },
});

export { expect } from "@playwright/test";
