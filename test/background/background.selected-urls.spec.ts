import { expect } from "vitest";
import type { Menus } from "webextension-polyfill";
import { getSelectedUrls } from "@/background/background.ts";

describe("Selected URLs", () => {
  it("should return the link URL if filled", () => {
    const onClickData: Menus.OnClickData = {
      editable: false,
      menuItemId: 0,
      modifiers: [],
      linkUrl: "linkUrl",
      selectionText: "selectionText",
    };

    const selectedUrls = getSelectedUrls(onClickData);

    expect(selectedUrls).toEqual(["linkUrl"]);
  });
  it("should parse the selection text if link URL is not provided", () => {
    const onClickData: Menus.OnClickData = {
      editable: false,
      menuItemId: 0,
      modifiers: [],
      selectionText: "selectionText1\n\nselectionText2 selectionText3",
    };

    const selectedUrls = getSelectedUrls(onClickData);

    expect(selectedUrls).toEqual(["selectionText1", "selectionText2", "selectionText3"]);
  });

  it("should return empty array if link URL and selection text is not provided", () => {
    const onClickData: Menus.OnClickData = {
      editable: false,
      menuItemId: 0,
      modifiers: [],
    };

    const selectedUrls = getSelectedUrls(onClickData);

    expect(selectedUrls).toEqual([]);
  });
});
