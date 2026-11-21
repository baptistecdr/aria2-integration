import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Downloads } from "webextension-polyfill";
import { isChromium } from "@/platform/browser-info";
import { captureURL } from "@/services/capture";
import browser from "../setupTests";

vi.mock("@/services/capture", () => ({
  captureTorrentFromURL: vi.fn(),
  captureURL: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/platform/browser-info", () => ({
  isChromium: vi.fn().mockReturnValue(false),
  isFirefox: vi.fn().mockReturnValue(true),
}));

vi.mock("@/platform/notifications", () => ({
  showNotification: vi.fn(),
}));

vi.mock("@/platform/tabs", () => ({
  findCurrentTab: vi.fn().mockResolvedValue(undefined),
}));

const SERVER_UUID = "6f1c7a3e-2b4d-4e8f-9a1b-3c5d7e9f1a2b";
const OPTIONS = {
  servers: { [SERVER_UUID]: { uuid: SERVER_UUID, name: "aria2", host: "127.0.0.1", port: 6800 } },
  captureDownloads: true,
  captureServer: SERVER_UUID,
};

type Listener = (...args: any[]) => Promise<void>;

// The listener most recently registered on a browser event by the background script.
function registered(event: { addListener: unknown }): Listener {
  return vi.mocked(event.addListener as (listener: Listener) => void).mock.calls.at(-1)?.[0] as Listener;
}

const downloadItem = () => ({ id: 1, filename: "/downloads/file.bin", url: "https://example.com/file.bin", totalBytes: 1024 }) as Downloads.DownloadItem;

describe("Background script", () => {
  let resolveStorage: (value: Record<string, unknown>) => void;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    browser.storage.sync.get.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStorage = resolve;
      }),
    );
    browser.downloads.cancel = vi.fn().mockResolvedValue(undefined);
    browser.downloads.erase = vi.fn().mockResolvedValue([]);
    browser.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.mocked(isChromium).mockReturnValue(false);
  });

  it("registers every listener synchronously, before the options are loaded", async () => {
    await import("@/background/index");

    expect(browser.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    expect(browser.downloads.onCreated.addListener).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
    expect(browser.commands.onCommand.addListener).toHaveBeenCalledTimes(1);
    expect(browser.alarms.onAlarm.addListener).toHaveBeenCalledTimes(1);
    expect(browser.alarms.create).toHaveBeenCalledTimes(1);
    expect(browser.downloads.onChanged.addListener).not.toHaveBeenCalled();
  });

  it("listens to download changes on Chromium only", async () => {
    vi.mocked(isChromium).mockReturnValue(true);

    await import("@/background/index");

    expect(browser.downloads.onChanged.addListener).toHaveBeenCalledTimes(1);
  });

  // Regression tests for https://github.com/baptistecdr/aria2-integration/issues/1356: after a browser restart, the
  // background page is only started by the download event itself, which is dispatched before the options are loaded.
  it("captures a download created before the options are loaded on Firefox", async () => {
    await import("@/background/index");

    const listener = registered(browser.downloads.onCreated)(downloadItem());
    resolveStorage({ options: JSON.stringify(OPTIONS) });
    await listener;

    expect(captureURL).toHaveBeenCalledOnce();
  });

  it("captures a download created before the options are loaded on Chromium", async () => {
    vi.mocked(isChromium).mockReturnValue(true);
    await import("@/background/index");

    await registered(browser.downloads.onCreated)({ ...downloadItem(), filename: "" });
    const listener = registered(browser.downloads.onChanged)({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });
    resolveStorage({ options: JSON.stringify(OPTIONS) });
    await listener;

    expect(captureURL).toHaveBeenCalledOnce();
  });

  it("does not capture a download when capture downloads is disabled", async () => {
    await import("@/background/index");

    const listener = registered(browser.downloads.onCreated)(downloadItem());
    resolveStorage({ options: JSON.stringify({ ...OPTIONS, captureDownloads: false }) });
    await listener;

    expect(captureURL).not.toHaveBeenCalled();
  });

  it("opens the options page when the extension is installed", async () => {
    browser.runtime.openOptionsPage = vi.fn().mockResolvedValue(undefined);
    await import("@/background/index");

    await registered(browser.runtime.onInstalled)({ reason: "update" });
    expect(browser.runtime.openOptionsPage).not.toHaveBeenCalled();

    await registered(browser.runtime.onInstalled)({ reason: "install" });
    expect(browser.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
