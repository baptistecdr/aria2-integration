import { type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server as HttpServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type BrowserContext, test as base, chromium, type Page, type Worker } from "@playwright/test";
import type { ExtensionOptions } from "@/models/extension-options";
import type { Server } from "@/models/server";

// Only available inside the extension's service worker, where the evaluated callbacks run.
declare const chrome: any;

const EXTENSION_PATH = resolve(import.meta.dirname, "..", "dist");
const ARIA2_SECRET = "e2e-secret";
export const SERVER_UUID = "6f1c7a3e-2b4d-4e8f-9a1b-3c5d7e9f1a2b";

export const FILE_SIZE = 64 * 1024;
const SLOW_FILE_SIZE = 100 * 1024 * 1024;

export interface RecordedRequest {
  url: string;
  headers: IncomingHttpHeaders;
}

export class FileServer {
  readonly requests: RecordedRequest[] = [];

  constructor(private readonly server: HttpServer) {}

  get origin() {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  url(path: string) {
    return `${this.origin}${path}`;
  }

  requestsTo(path: string) {
    return this.requests.filter((request) => request.url === path);
  }

  static async start(): Promise<FileServer> {
    const server = createServer();
    const fileServer = new FileServer(server);
    server.on("request", (req, res) => {
      const url = req.url ?? "/";
      fileServer.requests.push({ url, headers: req.headers });
      if (url === "/page.html") {
        res.writeHead(200, { "Content-Type": "text/html", "Set-Cookie": "session=e2e-cookie; Path=/" });
        res.end(`<!doctype html>
<html><body>
  <a id="download-bin" href="/files/archive.bin">archive.bin</a>
  <a id="download-zip" href="/files/archive.zip">archive.zip</a>
</body></html>`);
      } else if (url.startsWith("/files/")) {
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": FILE_SIZE,
          "Content-Disposition": `attachment; filename="${url.slice("/files/".length)}"`,
        });
        res.end(Buffer.alloc(FILE_SIZE, 1));
      } else if (url.startsWith("/slow/")) {
        // Trickle bytes so that the download stays active for the whole test.
        res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": SLOW_FILE_SIZE });
        const interval = setInterval(() => res.write(Buffer.alloc(1024, 1)), 200);
        res.on("close", () => clearInterval(interval));
      } else {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    return fileServer;
  }

  async stop() {
    this.server.closeAllConnections();
    await new Promise((r) => this.server.close(r));
  }
}

export class Aria2Daemon {
  private rpcId = 0;

  private constructor(
    private readonly process: ChildProcess,
    readonly port: number,
    readonly directory: string,
  ) {}

  get server(): Partial<Server> {
    return { uuid: SERVER_UUID, name: "E2E aria2", host: "127.0.0.1", port: this.port, path: "/jsonrpc", secret: ARIA2_SECRET };
  }

  async call<T = any>(method: string, ...params: unknown[]): Promise<T> {
    const res = await fetch(`http://127.0.0.1:${this.port}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: `${++this.rpcId}`, method, params: [`token:${ARIA2_SECRET}`, ...params] }),
    });
    const json = await res.json();
    if (json.error) {
      throw new Error(`${method}: ${json.error.message}`);
    }
    return json.result as T;
  }

  async tasks(): Promise<any[]> {
    const [active, waiting, stopped] = await Promise.all([
      this.call("aria2.tellActive"),
      this.call("aria2.tellWaiting", 0, 100),
      this.call("aria2.tellStopped", 0, 100),
    ]);
    return [...active, ...waiting, ...stopped];
  }

  async uris(): Promise<string[]> {
    // A uri is listed once per connection that used it.
    return [...new Set((await this.tasks()).flatMap((task) => task.files.flatMap((file: any) => file.uris.map((uri: any) => uri.uri))))];
  }

  static async start(): Promise<Aria2Daemon> {
    const port = await freePort();
    const directory = await mkdtemp(join(tmpdir(), "aria2-e2e-"));
    const process = spawn(
      globalThis.process.env.ARIA2C ?? "aria2c",
      [
        "--enable-rpc",
        `--rpc-listen-port=${port}`,
        `--rpc-secret=${ARIA2_SECRET}`,
        `--dir=${directory}`,
        "--no-conf",
        "--quiet",
        "--allow-overwrite=true",
        "--auto-file-renaming=false",
      ],
      { stdio: "ignore" },
    );
    const daemon = new Aria2Daemon(process, port, directory);
    const deadline = Date.now() + 10_000;
    while (true) {
      try {
        await daemon.call("aria2.getVersion");
        return daemon;
      } catch (error) {
        if (Date.now() > deadline || process.exitCode !== null) {
          process.kill();
          throw new Error(`aria2c did not start: ${error}`);
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  }

  async stop() {
    const exited = new Promise((r) => this.process.once("exit", r));
    this.process.kill();
    await exited;
    await rm(this.directory, { recursive: true, force: true });
  }
}

export async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  await new Promise((r) => server.close(r));
  return port;
}

// Missing fields are filled with their defaults when the extension reads the options.
type OptionsInput = Omit<Partial<ExtensionOptions>, "servers"> & { servers?: Record<string, Partial<Server>> };

export class Extension {
  constructor(
    readonly context: BrowserContext,
    readonly serviceWorker: Worker,
  ) {}

  get id() {
    return new URL(this.serviceWorker.url()).host;
  }

  url(path: string) {
    return `chrome-extension://${this.id}/${path}`;
  }

  async setOptions(options: OptionsInput) {
    await this.serviceWorker.evaluate((serialized) => chrome.storage.sync.set({ options: serialized }), JSON.stringify(options));
  }

  async getOptions(): Promise<ExtensionOptions> {
    const serialized = await this.serviceWorker.evaluate(async () => (await chrome.storage.sync.get("options")).options as string);
    return JSON.parse(serialized);
  }

  async openPopup(): Promise<Page> {
    const page = await this.context.newPage();
    await page.goto(this.url("popup/popup.html"));
    return page;
  }

  async openOptions(): Promise<Page> {
    const page = await this.context.newPage();
    await page.goto(this.url("options/options.html"));
    return page;
  }
}

interface Fixtures {
  context: BrowserContext;
  extension: Extension;
  aria2: Aria2Daemon;
  fileServer: FileServer;
}

export const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      locale: "en-US",
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`, "--lang=en-US"],
    });
    await use(context);
    await context.close();
  },
  extension: async ({ context }, use) => {
    const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    // Right after startup, managed storage only answers once Chromium has loaded the policies (~2 s), which delays every options read.
    await serviceWorker.evaluate(() => chrome.storage.managed.get(null));
    await use(new Extension(context, serviceWorker));
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern
  aria2: async ({}, use) => {
    const aria2 = await Aria2Daemon.start();
    await use(aria2);
    await aria2.stop();
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern
  fileServer: async ({}, use) => {
    const fileServer = await FileServer.start();
    await use(fileServer);
    await fileServer.stop();
  },
});

export { expect } from "@playwright/test";
