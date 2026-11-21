import { describe, expect, it, vi } from "vitest";
import browser, { type Downloads } from "webextension-polyfill";
import { createFirefoxDownloadInterceptor } from "@/background/download-interceptors/firefox";

describe("Firefox download interceptor", () => {
  it("should capture downloads as soon as they are created", async () => {
    const capture = vi.fn().mockResolvedValue(undefined);
    createFirefoxDownloadInterceptor(capture).listen(browser.downloads);
    const onCreated = vi.mocked(browser.downloads.onCreated.addListener).mock.calls.at(-1)?.[0] as (item: Downloads.DownloadItem) => Promise<void>;

    await onCreated({
      id: 1,
      url: "https://example.com/file.bin",
      filename: "/downloads/file.bin",
      totalBytes: 1024,
      referrer: "https://example.com/",
    } as Downloads.DownloadItem);

    expect(capture).toHaveBeenCalledWith({
      id: 1,
      url: "https://example.com/file.bin",
      filename: "/downloads/file.bin",
      totalBytes: 1024,
      referrer: "https://example.com/",
    });
  });

  it("should not listen to download changes", () => {
    vi.mocked(browser.downloads.onChanged.addListener).mockClear();

    createFirefoxDownloadInterceptor(vi.fn()).listen(browser.downloads);

    expect(browser.downloads.onChanged.addListener).not.toHaveBeenCalled();
  });
});
