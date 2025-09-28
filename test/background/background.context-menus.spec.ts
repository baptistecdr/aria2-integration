import { expect, vi } from "vitest";
import browser from "webextension-polyfill";
import { CONTEXT_MENUS_PARENT_ID, createContextMenus } from "@/background/background";
import ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";

describe("Context Menus", () => {
  beforeEach(() => {
    browser.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    browser.contextMenus.create = vi.fn().mockResolvedValue(undefined);
  });

  it("should create a single server menu if only one server exists", async () => {
    const extensionOptions = new ExtensionOptions({
      server1: new Server(),
    });

    await createContextMenus(extensionOptions);

    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Translated: contextMenusTitle",
      id: "server1",
      contexts: ["link", "selection"],
    });
  });

  it("should create parent and child menus if multiple servers exist", async () => {
    const extensionOptions = new ExtensionOptions({
      server1: new Server("1", "Server 1"),
      server2: new Server("2", "Server 2"),
    });

    await createContextMenus(extensionOptions);

    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledTimes(3); // Parent + 2 servers
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Translated: contextMenusTitle",
      id: CONTEXT_MENUS_PARENT_ID,
      contexts: ["link", "selection"],
    });
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Server 1",
      parentId: CONTEXT_MENUS_PARENT_ID,
      id: "server1",
      contexts: ["link", "selection"],
    });
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      title: "Server 2",
      parentId: CONTEXT_MENUS_PARENT_ID,
      id: "server2",
      contexts: ["link", "selection"],
    });
  });

  it("should not create any menus if no servers exist", async () => {
    const extensionOptions = new ExtensionOptions();

    await createContextMenus(extensionOptions);

    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).not.toHaveBeenCalled();
  });
});
