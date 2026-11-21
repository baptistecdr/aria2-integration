import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import i18n, { getUILanguage } from "@/platform/i18n";
import browser from "../setupTests";

const LOCALES_DIRECTORY = resolve(import.meta.dirname, "..", "..", "public", "_locales");

function messageKeys(locale: string): string[] {
  return Object.keys(JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, locale, "messages.json"), "utf8"))).sort();
}

describe("i18n", () => {
  it("gets the message with its substitutions", () => {
    expect(i18n("addFileSuccess", "NAS")).toBe("Translated: addFileSuccess");
    expect(browser.i18n.getMessage).toHaveBeenCalledWith("addFileSuccess", "NAS");
  });

  it("gets the browser language", () => {
    expect(getUILanguage()).toBe("en");
  });

  // MessageKey is typed from the English messages: the other locales must define the same messages.
  it.each(readdirSync(LOCALES_DIRECTORY).filter((locale) => locale !== "en"))("defines the same messages in %s as in English", (locale) => {
    expect(messageKeys(locale)).toEqual(messageKeys("en"));
  });
});
