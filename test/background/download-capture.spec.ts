import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tabs } from "webextension-polyfill";
import type { Connections } from "@/background/connections";
import { type BrowserDownload, createDownloadCapturer } from "@/background/download-capture";
import { Server } from "@/domain/server";
import { showNotification } from "@/platform/notifications";
import { findCurrentTab } from "@/platform/tabs";
import type { Aria2Client } from "@/services/aria2-client";
import { captureUrl } from "@/services/capture";
import { fakeOptionsStore } from "../helpers/fake-options-store";
import browser from "../setupTests";

vi.mock("@/services/capture", () => ({
  captureUrl: vi.fn(),
}));

vi.mock("@/platform/cookies", () => ({
  getCookies: vi.fn().mockResolvedValue("session=1;"),
}));

vi.mock("@/platform/notifications", () => ({
  showNotification: vi.fn(),
}));

vi.mock("@/platform/tabs", () => ({
  findCurrentTab: vi.fn(),
}));

describe("Download capture", () => {
  const SERVER_UUID = "6f1c7a3e-2b4d-4e8f-9a1b-3c5d7e9f1a2b";
  const server = Server.create({ uuid: SERVER_UUID, name: "aria2" });
  const aria2 = { call: vi.fn(), multicall: vi.fn() } as unknown as Aria2Client;
  const connections: Connections = { get: (id) => (id === SERVER_UUID ? aria2 : undefined), all: () => [[server, aria2]] };
  const captureOptions = { servers: { [SERVER_UUID]: server }, captureDownloads: true, captureServer: SERVER_UUID };
  const download = (overrides: Partial<BrowserDownload> = {}): BrowserDownload => ({
    id: 1,
    url: "https://example.com/file.bin",
    filename: "/downloads/file.bin",
    totalBytes: 1024,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(captureUrl).mockResolvedValue(undefined);
    vi.mocked(findCurrentTab).mockResolvedValue({ url: "https://example.com/page", incognito: false, cookieStoreId: "store-1" } as Tabs.Tab);
    browser.downloads.cancel = vi.fn().mockResolvedValue(undefined);
    browser.downloads.removeFile = vi.fn().mockResolvedValue(undefined);
    browser.downloads.erase = vi.fn().mockResolvedValue([]);
  });

  it("should cancel the browser download and send it to aria2 with the current page as referer", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore(captureOptions), connections })(download());

    expect(browser.downloads.cancel).toHaveBeenCalledWith(1);
    expect(browser.downloads.erase).toHaveBeenCalledWith({ id: 1 });
    expect(captureUrl).toHaveBeenCalledWith(aria2, server, {
      url: "https://example.com/file.bin",
      referer: "https://example.com/page",
      cookies: "session=1;",
      incognito: false,
      directory: undefined,
      filename: "file.bin",
    });
    expect(showNotification).toHaveBeenCalledWith("Translated: addFileSuccess");
  });

  it("should prefer the referrer reported by the browser", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore(captureOptions), connections })(download({ referrer: "https://referrer.com/" }));

    expect(captureUrl).toHaveBeenCalledWith(aria2, server, expect.objectContaining({ referer: "https://referrer.com/" }));
  });

  it("should use the current page as referer when the browser reports about:blank", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore(captureOptions), connections })(download({ referrer: "about:blank" }));

    expect(captureUrl).toHaveBeenCalledWith(aria2, server, expect.objectContaining({ referer: "https://example.com/page" }));
  });

  it("should keep the browser's directory when the complete file path is used", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore({ ...captureOptions, useCompleteFilePath: true }), connections })(download());

    expect(captureUrl).toHaveBeenCalledWith(aria2, server, expect.objectContaining({ directory: "/downloads", filename: "file.bin" }));
  });

  it("should tell aria2 when the download comes from a private window", async () => {
    vi.mocked(findCurrentTab).mockResolvedValue({ url: "https://example.com/page", incognito: true } as Tabs.Tab);

    await createDownloadCapturer({ store: fakeOptionsStore(captureOptions), connections })(download());

    expect(captureUrl).toHaveBeenCalledWith(aria2, server, expect.objectContaining({ incognito: true }));
  });

  it("should not capture the download when capture downloads is disabled", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore({ ...captureOptions, captureDownloads: false }), connections })(download());

    expect(browser.downloads.cancel).not.toHaveBeenCalled();
    expect(captureUrl).not.toHaveBeenCalled();
  });

  it("should not capture the download when the capture server no longer exists", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore({ ...captureOptions, captureServer: "deleted" }), connections })(download());

    expect(captureUrl).not.toHaveBeenCalled();
  });

  it("should let the browser download excluded files", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore({ ...captureOptions, excludedFileTypes: ["bin"] }), connections })(download());

    expect(browser.downloads.cancel).not.toHaveBeenCalled();
    expect(captureUrl).not.toHaveBeenCalled();
  });

  it("should notify the error when aria2 rejects the download", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(captureUrl).mockRejectedValueOnce(new Error("aria2 is down"));

    await expect(createDownloadCapturer({ store: fakeOptionsStore(captureOptions), connections })(download())).resolves.toBeUndefined();

    expect(showNotification).toHaveBeenCalledWith("Translated: addFileError");
  });

  it("should not notify when the user turned notifications off", async () => {
    await createDownloadCapturer({ store: fakeOptionsStore({ ...captureOptions, notifyFileIsAdded: false }), connections })(download());

    expect(showNotification).not.toHaveBeenCalled();
  });

  it("should still send the download to aria2 when the browser download cannot be cancelled", async () => {
    browser.downloads.cancel = vi.fn().mockRejectedValue(new Error("already complete"));

    await createDownloadCapturer({ store: fakeOptionsStore(captureOptions), connections })(download());

    expect(browser.downloads.removeFile).toHaveBeenCalledWith(1);
    expect(browser.downloads.erase).toHaveBeenCalledWith({ id: 1 });
    expect(captureUrl).toHaveBeenCalled();
  });
});
