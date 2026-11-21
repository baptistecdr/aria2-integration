import { afterEach, describe, expect, it } from "vitest";
import * as browserInfo from "@/platform/browser-info";
import browser from "../setupTests";

describe("isFirefox", () => {
  afterEach(() => {
    browser.downloads.onDeterminingFilename = undefined;
  });

  it("returns true if downloads.onDeterminingFilename is undefined", () => {
    expect(browserInfo.isFirefox()).toBe(true);
  });

  it("returns false if downloads.onDeterminingFilename is defined", () => {
    browser.downloads.onDeterminingFilename = {};
    expect(browserInfo.isFirefox()).toBe(false);
  });
});
