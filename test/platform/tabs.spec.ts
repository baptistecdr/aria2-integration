import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { findCurrentTab } from "@/platform/tabs";

describe("findCurrentTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the active tab from the current window", async () => {
    const mockTab = {
      id: 1,
      windowId: 1,
      url: "https://example.com",
      active: true,
      highlighted: true,
      pinned: false,
    };

    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);

    const tab = await findCurrentTab();

    expect(browser.tabs.query).toHaveBeenCalledWith({
      currentWindow: true,
      active: true,
    });
    expect(tab).toEqual(mockTab);
  });

  it("should return undefined when no tabs are found", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([]);

    const tab = await findCurrentTab();

    expect(tab).toBeUndefined();
  });

  it("should return the first tab when multiple tabs are returned", async () => {
    const mockTab1 = { id: 1, url: "https://example.com", active: true };
    const mockTab2 = { id: 2, url: "https://example2.com", active: true };

    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab1, mockTab2] as any);

    const tab = await findCurrentTab();

    expect(tab).toEqual(mockTab1);
  });

  it("should propagate browser API errors", async () => {
    const error = new Error("Browser API error");
    vi.mocked(browser.tabs.query).mockRejectedValueOnce(error);

    await expect(findCurrentTab()).rejects.toThrow("Browser API error");
  });
});
