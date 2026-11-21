import type Aria2 from "@baptistecdr/aria2";
import { beforeEach, describe, expect, it, vi } from "vitest";
import browser, { type Menus, type Tabs } from "webextension-polyfill";
import type { Connections } from "@/background/connections";
import {
  CONTEXT_MENUS_PARENT_ID,
  createContextMenuClickHandler,
  createContextMenus,
  getSelectedUrls,
  keepContextMenusInSync,
} from "@/background/context-menus";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import { getCookies } from "@/platform/cookies";
import { showNotification } from "@/platform/notifications";
import { captureURL } from "@/services/capture";
import { fakeOptionsStore } from "../helpers/fake-options-store";

vi.mock("@/platform/cookies", () => ({
  getCookies: vi.fn().mockResolvedValue("session=1;"),
}));

vi.mock("@/platform/notifications", () => ({
  showNotification: vi.fn(),
}));

vi.mock("@/services/capture", () => ({
  captureURL: vi.fn(),
}));

describe("Context Menus", () => {
  beforeEach(() => {
    browser.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    browser.contextMenus.create = vi.fn().mockResolvedValue(undefined);
  });

  it("should create a single server menu if only one server exists", async () => {
    const extensionOptions = ExtensionOptions.create({
      servers: { server1: Server.create() },
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
    const extensionOptions = ExtensionOptions.create({
      servers: {
        server1: Server.create({ uuid: "1", name: "Server 1" }),
        server2: Server.create({ uuid: "2", name: "Server 2" }),
      },
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
    const extensionOptions = ExtensionOptions.create();

    await createContextMenus(extensionOptions);

    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).not.toHaveBeenCalled();
  });
});

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

describe("Context menus sync", () => {
  beforeEach(() => {
    browser.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    browser.contextMenus.create = vi.fn().mockResolvedValue(undefined);
  });

  it("should create the menus once the options are loaded and recreate them when the servers change", async () => {
    const store = fakeOptionsStore({ servers: { server1: Server.create() } });

    keepContextMenusInSync(store);
    await vi.waitFor(() => expect(browser.contextMenus.create).toHaveBeenCalledTimes(1));

    await store.update((options) => ExtensionOptions.withOverrides(options, { servers: {} }));
    await vi.waitFor(() => expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(2));
    expect(browser.contextMenus.create).toHaveBeenCalledTimes(1);
  });
});

describe("Context menu click", () => {
  const server = Server.create({ uuid: "server1", name: "aria2" });
  const aria2 = { call: vi.fn(), multicall: vi.fn() } as unknown as Aria2;
  const connections: Connections = { get: (id) => (id === "server1" ? aria2 : undefined), all: () => [[server, aria2]] };
  const tab = { url: "https://example.com/page", incognito: true, cookieStoreId: "store-1" } as Tabs.Tab;
  const click = (info: Partial<Menus.OnClickData>) => ({ editable: false, modifiers: [], menuItemId: "server1", ...info }) as Menus.OnClickData;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(captureURL).mockResolvedValue(undefined);
  });

  it("should send every selected URL to the clicked server with the page as referer", async () => {
    const handler = createContextMenuClickHandler({ store: fakeOptionsStore({ servers: { server1: server } }), connections });

    await handler(click({ selectionText: "https://a.com/1 https://b.com/2" }), tab);

    expect(getCookies).toHaveBeenCalledWith("https://a.com/1", "store-1");
    expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://a.com/1", "https://example.com/page", "session=1;", true);
    expect(captureURL).toHaveBeenCalledWith(aria2, server, "https://b.com/2", "https://example.com/page", "session=1;", true);
    expect(showNotification).toHaveBeenCalledWith("Translated: addUrlSuccess");
  });

  it("should notify the error when aria2 rejects the URL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(captureURL).mockRejectedValueOnce(new Error("aria2 is down"));
    const handler = createContextMenuClickHandler({ store: fakeOptionsStore({ servers: { server1: server } }), connections });

    await handler(click({ linkUrl: "https://a.com/1" }), tab);

    expect(showNotification).toHaveBeenCalledWith("Translated: addUrlError");
  });

  it("should ignore clicks on a server that no longer exists", async () => {
    const handler = createContextMenuClickHandler({ store: fakeOptionsStore(), connections });

    await handler(click({ menuItemId: "deleted", linkUrl: "https://a.com/1" }), tab);

    expect(captureURL).not.toHaveBeenCalled();
  });
});
