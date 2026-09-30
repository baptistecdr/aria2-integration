import { beforeEach, describe, expect, it, vi } from "vitest";
import browser, { type Cookies } from "webextension-polyfill";
import { isFirefox } from "@/aria2-extension";
import { formatCookies, getCookies } from "@/background/background";

vi.mock("@/aria2-extension", () => ({
  captureTorrentFromURL: vi.fn(),
  captureURL: vi.fn(),
  isChromium: vi.fn(),
  isFirefox: vi.fn(),
  showNotification: vi.fn(),
}));

describe("Cookies", () => {
  function createCookie(name: string, value: string): Cookies.Cookie {
    return {
      domain: "domain",
      firstPartyDomain: "firstPartyDomain",
      hostOnly: false,
      httpOnly: false,
      path: "path",
      sameSite: "strict",
      secure: false,
      session: false,
      storeId: "storeId",
      name: name,
      value: value,
    };
  }

  it("should format cookies", () => {
    const cookies = [createCookie("name1", "value1"), createCookie("name2", "value2")];

    const formattedCookies = formatCookies(cookies);

    expect(formattedCookies).toEqual("name1=value1;name2=value2;");
  });

  describe("getCookies", () => {
    const url = "https://example.com/file.zip";

    beforeEach(() => {
      vi.mocked(browser.cookies.getAll)
        .mockReset()
        .mockResolvedValue([createCookie("name1", "value1")]);
    });

    it("should ignore the first-party domain on Firefox so First-Party Isolation does not filter cookies", async () => {
      vi.mocked(isFirefox).mockReturnValue(true);

      const cookies = await getCookies(url, "firefox-container-1");

      expect(browser.cookies.getAll).toHaveBeenCalledWith({ url, storeId: "firefox-container-1", firstPartyDomain: null });
      expect(cookies).toEqual("name1=value1;");
    });

    it("should not send firstPartyDomain on Chromium", async () => {
      vi.mocked(isFirefox).mockReturnValue(false);

      await getCookies(url);

      const details = vi.mocked(browser.cookies.getAll).mock.calls[0][0];
      expect(details).toEqual({ url, storeId: undefined });
      expect(details).not.toHaveProperty("firstPartyDomain");
    });
  });
});
