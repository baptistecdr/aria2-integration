import { beforeEach, describe, expect, it, vi } from "vitest";
import browser, { type Downloads } from "webextension-polyfill";
import { createChromiumDownloadInterceptor } from "@/background/download-interceptors/chromium";

describe("Chromium download interceptor", () => {
  const capture = vi.fn();
  let onCreated: (item: Downloads.DownloadItem & { finalUrl?: string }) => void;
  let onChanged: (delta: Downloads.OnChangedDownloadDeltaType) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.mockResolvedValue(undefined);
    createChromiumDownloadInterceptor(capture).listen(browser.downloads);
    onCreated = vi.mocked(browser.downloads.onCreated.addListener).mock.calls.at(-1)?.[0] as typeof onCreated;
    onChanged = vi.mocked(browser.downloads.onChanged.addListener).mock.calls.at(-1)?.[0] as typeof onChanged;
  });

  const item = { id: 1, url: "https://example.com/redirect", filename: "", totalBytes: 1024, referrer: "https://example.com/" } as Downloads.DownloadItem;

  it("should wait for the filename before capturing the download, with the URL after redirects", async () => {
    onCreated({ ...item, finalUrl: "https://cdn.example.com/file.bin" });
    expect(capture).not.toHaveBeenCalled();

    await onChanged({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });

    expect(capture).toHaveBeenCalledWith({
      id: 1,
      url: "https://cdn.example.com/file.bin",
      filename: "/downloads/file.bin",
      totalBytes: 1024,
      referrer: "https://example.com/",
    });
  });

  it("should use the original URL when there is no redirect", async () => {
    onCreated(item);

    await onChanged({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });

    expect(capture).toHaveBeenCalledWith(expect.objectContaining({ url: "https://example.com/redirect" }));
  });

  it("should capture a download only once", async () => {
    onCreated(item);

    await onChanged({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });
    await onChanged({ id: 1, filename: { previous: "", current: "/downloads/file (1).bin" } });

    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("should ignore changes of downloads it did not see created", async () => {
    await expect(onChanged({ id: 123456 } as Downloads.OnChangedDownloadDeltaType)).resolves.toBeUndefined();

    expect(capture).not.toHaveBeenCalled();
  });

  it("should forget downloads that end without getting a filename", async () => {
    onCreated(item);

    await onChanged({ id: 1, state: { previous: "in_progress", current: "interrupted" } });
    await onChanged({ id: 1, filename: { previous: "", current: "/downloads/file.bin" } });

    expect(capture).not.toHaveBeenCalled();
  });
});
