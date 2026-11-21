import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Playwright can't load extensions in Firefox: Firefox is driven through WebDriver BiDi instead,
// see https://w3c.github.io/webdriver-bidi/. Only the few commands the tests need are implemented.

const DEFAULT_FIREFOX_PATH = process.platform === "darwin" ? "/Applications/Firefox.app/Contents/MacOS/firefox" : "firefox";
const STARTUP_TIMEOUT_MS = 30_000;
// How long close() waits for Firefox to quit before killing it.
const CLOSE_TIMEOUT_MS = 5_000;

export interface FirefoxOptions {
  // Extension id -> moz-extension:// host, so that the extension pages have a known URL.
  extensionUuids: Record<string, string>;
  // Hosts resolved to the loopback address.
  localHosts: string[];
}

type Pending = { resolve: (result: any) => void; reject: (error: Error) => void };

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

export class Firefox {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  private constructor(
    private readonly process: ChildProcess,
    private readonly socket: WebSocket,
    private readonly workDirectory: string,
    // Where Firefox saves the downloads it is not asked about.
    readonly downloadDirectory: string,
  ) {
    // Firefox crashed or quit: the requests still waiting for an answer would never get one.
    socket.onclose = () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("Firefox connection closed"));
      }
      this.pending.clear();
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (pending === undefined) {
        return;
      }
      this.pending.delete(message.id);
      if (message.type === "error") {
        pending.reject(new Error(`${message.error}: ${message.message}`));
      } else {
        pending.resolve(message.result);
      }
    };
  }

  static async launch({ extensionUuids, localHosts }: FirefoxOptions): Promise<Firefox> {
    const workDirectory = mkdtempSync(join(tmpdir(), "aria2-integration-firefox-"));
    const profile = join(workDirectory, "profile");
    const downloadDirectory = join(workDirectory, "downloads");
    mkdirSync(profile);
    mkdirSync(downloadDirectory);
    const prefs: Record<string, unknown> = {
      "extensions.webextensions.uuids": JSON.stringify(extensionUuids),
      "network.dns.localDomains": localHosts.join(","),
      "browser.download.folderList": 2,
      "browser.download.dir": downloadDirectory,
      "browser.download.useDownloadDir": true,
      "browser.download.always_ask_before_handling_new_types": false,
      "browser.download.alwaysOpenPanel": false,
    };
    writeFileSync(
      join(profile, "user.js"),
      Object.entries(prefs)
        .map(([name, value]) => `user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});`)
        .join("\n"),
    );

    const port = await freePort();
    const firefoxPath = process.env.FIREFOX_PATH ?? DEFAULT_FIREFOX_PATH;
    const process_ = spawn(
      firefoxPath,
      ["-headless", "-no-remote", "-profile", profile, `--remote-debugging-port=${port}`],
      // System access lets the tests stop the background script like Firefox does when it is idle or at startup.
      { stdio: "ignore", env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: "1" } },
    );
    // Stops waiting for Firefox as soon as it can't run or quits, instead of retrying until the timeout.
    let startFailure: Error | undefined;
    process_.once("error", (error) => {
      startFailure = new Error(`Cannot run Firefox at ${firefoxPath} (${error.message}): set FIREFOX_PATH to the Firefox executable.`);
    });
    process_.once("exit", (code, signal) => {
      startFailure ??= new Error(`Firefox quit while starting (${signal ?? `exit code ${code}`}).`);
    });

    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    for (;;) {
      if (startFailure !== undefined) {
        rmSync(workDirectory, { recursive: true, force: true });
        throw startFailure;
      }
      let socket: WebSocket | undefined;
      try {
        socket = await new Promise<WebSocket>((resolve, reject) => {
          const ws = new WebSocket(`ws://127.0.0.1:${port}/session`);
          ws.onopen = () => resolve(ws);
          ws.onerror = () => reject(new Error("Firefox is not listening yet"));
        });
        const firefox = new Firefox(process_, socket, workDirectory, downloadDirectory);
        await firefox.send("session.new", { capabilities: {} });
        return firefox;
      } catch (error) {
        // The connection is retried from scratch.
        socket?.close();
        if (Date.now() > deadline) {
          process_.kill();
          rmSync(workDirectory, { recursive: true, force: true });
          throw new Error(`Firefox did not start: ${error}`);
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  // Evaluates the expression in the browsing context and returns its value, awaiting it when it is a promise.
  // The value must be serializable to JSON.
  async evaluate<T>(context: string, expression: string): Promise<T> {
    // BiDi has its own serialization of objects: JSON is simpler to read back.
    const json = `Promise.resolve(${expression}).then((value) => JSON.stringify(value) ?? "null")`;
    const result = await this.send("script.evaluate", { expression: json, target: { context }, awaitPromise: true });
    if (result.type === "exception") {
      throw new Error(`${expression}: ${result.exceptionDetails.text}`);
    }
    return JSON.parse(result.result.value);
  }

  async installExtension(path: string): Promise<void> {
    await this.send("webExtension.install", { extensionData: { type: "path", path } });
  }

  // The first tab of the browser.
  async tab(): Promise<string> {
    const { contexts } = await this.send("browsingContext.getTree", {});
    return contexts[0].context;
  }

  async newTab(): Promise<string> {
    const { context } = await this.send("browsingContext.create", { type: "tab" });
    return context;
  }

  // The browser window itself, where the evaluated code has access to Firefox internals.
  async chromeWindow(): Promise<string> {
    const { contexts } = await this.send("browsingContext.getTree", { "moz:scope": "chrome" });
    return contexts[0].context;
  }

  async navigate(context: string, url: string): Promise<void> {
    await this.send("browsingContext.navigate", { context, url, wait: "complete" });
  }

  async close(): Promise<void> {
    this.socket.close();
    // Firefox may have crashed already: its exit event won't come again.
    if (this.process.exitCode === null && this.process.signalCode === null) {
      const exited = new Promise((resolve) => this.process.once("exit", resolve));
      this.process.kill();
      const timeoutId = setTimeout(() => this.process.kill("SIGKILL"), CLOSE_TIMEOUT_MS);
      await exited;
      clearTimeout(timeoutId);
    }
    rmSync(this.workDirectory, { recursive: true, force: true });
  }
}
