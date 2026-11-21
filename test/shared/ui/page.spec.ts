import { afterEach, describe, expect, it } from "vitest";
import { describePage, extensionName } from "@/shared/ui/page";
import browser from "../../setupTests";

describe("describePage", () => {
  afterEach(() => {
    browser.i18n.getUILanguage.mockImplementation(() => "en");
  });

  it("declares the browser's language and the title of the page", () => {
    browser.i18n.getUILanguage.mockImplementation(() => "fr");

    describePage("Aria2 Integration - Options");

    expect(document.documentElement.lang).toBe("fr");
    expect(document.title).toBe("Aria2 Integration - Options");
  });

  it("gives the translated name of the extension", () => {
    expect(extensionName()).toBe("Translated: extName");
  });
});
