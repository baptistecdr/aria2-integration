import { createHash } from "node:crypto";
import { accessSync, constants, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server as HttpServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import Aria2 from "@baptistecdr/aria2";
import { type BrowserContext, test as base, chromium, type Page, type Worker } from "@playwright/test";
import type { ExtensionOptions } from "@/models/extension-options";
import type { Server } from "@/models/server";

// Only available inside the extension's service worker, where the evaluated callbacks run.
declare const chrome: any;

const EXTENSION_PATH = resolve(import.meta.dirname, "..", "dist");
// Where Chrome for Testing reads enterprise policies on Linux. CI makes it writable; elsewhere, policy tests are skipped.
const POLICY_DIR = "/etc/opt/chrome_for_testing/policies/managed";
const POLICY_FILE = `${POLICY_DIR}/aria2-integration-e2e.json`;
const ARIA2_SECRET = "e2e-secret";
export const SERVER_UUID = "6f1c7a3e-2b4d-4e8f-9a1b-3c5d7e9f1a2b";

const FILE_SERVER_HOST = "host.docker.internal";

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
    // aria2 runs in Docker: the browser maps this host to 127.0.0.1 (see the context fixture) so both reach the server with the same URLs.
    return `http://${FILE_SERVER_HOST}:${(this.server.address() as AddressInfo).port}`;
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
    // Listen on every interface: the aria2 container connects through the Docker host gateway.
    await new Promise<void>((r) => server.listen(0, "0.0.0.0", r));
    return fileServer;
  }

  async stop() {
    this.server.closeAllConnections();
    await new Promise((r) => this.server.close(r));
  }
}

// Must match the aria2 service in compose.yaml.
const ARIA2_PORT = 16800;

const ARIA2_SERVER: Partial<Server> = {
  uuid: SERVER_UUID,
  name: "E2E aria2",
  host: "127.0.0.1",
  port: ARIA2_PORT,
  path: "/jsonrpc",
  secret: ARIA2_SECRET,
};

// The client used by the extension, pointed at the daemon from compose.yaml.
export class Aria2Daemon extends Aria2 {
  constructor() {
    super(ARIA2_SERVER);
  }

  // The server to put in the extension options.
  get server(): Partial<Server> {
    return ARIA2_SERVER;
  }

  async tasks(): Promise<any[]> {
    const groups: unknown[] = await this.multicall([["tellActive"], ["tellWaiting", 0, 100], ["tellStopped", 0, 100]]);
    return groups.flatMap((tasks) => (Array.isArray(tasks) ? tasks : []));
  }

  async uris(): Promise<string[]> {
    // A uri is listed once per connection that used it.
    return [...new Set((await this.tasks()).flatMap((task) => task.files.flatMap((file: any) => file.uris.map((uri: any) => uri.uri))))];
  }

  // The daemon is shared by every test: empty its queue so that each test starts from scratch.
  async reset() {
    const pending = [...(await this.call("aria2.tellActive")), ...(await this.call("aria2.tellWaiting", 0, 1000))];
    await Promise.all(pending.map((task) => this.call("aria2.forceRemove", task.gid)));
    const deadline = Date.now() + 10_000;
    while ((await this.call("aria2.tellActive")).length > 0 || (await this.call("aria2.tellWaiting", 0, 1)).length > 0) {
      if (Date.now() > deadline) {
        throw new Error("aria2 did not remove its downloads");
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    await this.call("aria2.purgeDownloadResult");
  }
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

// Chromium derives the id of an unpacked extension from its path: the first 32 hex digits of its SHA-256, mapped to a-p.
function unpackedExtensionId(path: string): string {
  const hash = createHash("sha256").update(path).digest("hex").slice(0, 32);
  return [...hash].map((digit) => String.fromCharCode("a".charCodeAt(0) + Number.parseInt(digit, 16))).join("");
}

export function canInstallPolicies(): boolean {
  try {
    accessSync(POLICY_DIR, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// The same keys as in policies.json, servers given as a list (see public/managed-schema.json).
type PolicyInput = Omit<OptionsInput, "servers"> & { servers?: Partial<Server>[] };

interface Fixtures {
  policy: PolicyInput | undefined;
  context: BrowserContext;
  extension: Extension;
  aria2: Aria2Daemon;
  fileServer: FileServer;
}

export const test = base.extend<Fixtures>({
  // Set with test.use() to start the browser with this enterprise policy for the extension.
  policy: [undefined, { option: true }],
  context: async ({ policy }, use) => {
    if (policy) {
      writeFileSync(POLICY_FILE, JSON.stringify({ "3rdparty": { extensions: { [unpackedExtensionId(EXTENSION_PATH)]: policy } } }));
    }
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      locale: "en-US",
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--lang=en-US",
        `--host-resolver-rules=MAP ${FILE_SERVER_HOST} 127.0.0.1`,
      ],
    });
    try {
      await use(context);
    } finally {
      await context.close();
      if (policy) {
        rmSync(POLICY_FILE, { force: true });
      }
    }
  },
  extension: async ({ context }, use) => {
    const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    // Right after startup, managed storage only answers once Chromium has loaded the policies (~2 s), which delays every options read.
    await serviceWorker.evaluate(() => chrome.storage.managed.get(null));
    await use(new Extension(context, serviceWorker));
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
