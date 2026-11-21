import { afterEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { createDownloadInterceptor } from "@/background/download-interceptors";
import { isChromium } from "@/platform/browser-info";

vi.mock("@/platform/browser-info", () => ({
  isChromium: vi.fn(),
}));

describe("createDownloadInterceptor", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should use the Chromium strategy on Chromium", () => {
    vi.mocked(isChromium).mockReturnValue(true);

    createDownloadInterceptor(vi.fn()).listen(browser.downloads);

    expect(browser.downloads.onChanged.addListener).toHaveBeenCalled();
  });

  it("should use the Firefox strategy on Firefox", () => {
    vi.mocked(isChromium).mockReturnValue(false);

    createDownloadInterceptor(vi.fn()).listen(browser.downloads);

    expect(browser.downloads.onCreated.addListener).toHaveBeenCalled();
    expect(browser.downloads.onChanged.addListener).not.toHaveBeenCalled();
  });
});
