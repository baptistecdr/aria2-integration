import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import Theme from "@/domain/theme";
import { createOptionsStore, loadOptions, type OptionsStore, saveOptions } from "@/services/options-store";

const createMockServer = (overrides?: Partial<Server>): Server =>
  Server.create({
    uuid: "test-uuid",
    name: "Test Server",
    ...overrides,
  });

// Fakes the sync storage area and its onChanged event so that the store can be tested end to end.
function fakeSyncStorage(initial?: ExtensionOptions) {
  let stored: Record<string, unknown> = initial ? { options: ExtensionOptions.serialize(initial) } : {};
  const listeners: ((changes: Record<string, unknown>, areaName: string) => void)[] = [];
  vi.mocked(browser.storage.sync.get).mockImplementation(async () => ({ ...stored }));
  vi.mocked(browser.storage.sync.set).mockImplementation(async (items: Record<string, unknown>) => {
    stored = { ...stored, ...items };
    for (const listener of listeners) listener({ options: { newValue: items.options } }, "sync");
  });
  vi.mocked(browser.storage.onChanged.addListener).mockImplementation((listener: any) => {
    listeners.push(listener);
  });
  return {
    stored: () => ExtensionOptions.deserialize(stored.options as string),
    // Simulates a write made by another extension page.
    writeFromElsewhere(options: ExtensionOptions) {
      stored = { options: ExtensionOptions.serialize(options) };
      for (const listener of listeners) listener({ options: { newValue: stored.options } }, "sync");
    },
  };
}

describe("options store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(browser.storage.sync.get).mockReset().mockResolvedValue({});
    vi.mocked(browser.storage.sync.set).mockReset().mockResolvedValue(undefined);
    vi.mocked(browser.storage.onChanged.addListener).mockReset();
  });

  describe("saveOptions", () => {
    it("should save options to browser storage with correct format", async () => {
      const options = ExtensionOptions.create();

      await saveOptions(options);

      expect(browser.storage.sync.set).toHaveBeenCalledWith({ options: ExtensionOptions.serialize(options) });
      expect(browser.storage.sync.set).toHaveBeenCalledTimes(1);
    });
  });

  describe("loadOptions with managed storage", () => {
    afterEach(() => {
      delete (browser.storage as any).managed;
      vi.restoreAllMocks();
    });

    const managedUuid = "0b6a1f9e-3c2d-4e5f-8a9b-1c2d3e4f5a6b";

    it("should override stored options with managed ones and convert servers list", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: ExtensionOptions.serialize(ExtensionOptions.create({ captureDownloads: false, notifyErrorOccurs: true })),
      });
      (browser.storage as any).managed = {
        get: vi.fn().mockResolvedValue({
          servers: [{ uuid: managedUuid, name: "aria2", host: "aria2.lan", port: 6801 }],
          captureServer: managedUuid,
          captureDownloads: true,
        }),
      };

      const options = await loadOptions();

      expect(options.captureDownloads).toBe(true);
      expect(options.notifyErrorOccurs).toBe(true);
      expect(options.servers[managedUuid].name).toBe("aria2");
      expect(options.servers[managedUuid].host).toBe("aria2.lan");
      expect(options.servers[managedUuid].port).toBe(6801);
      expect(options.captureServer).toBe(managedUuid);
    });

    it("should keep stored options that the policy does not set", async () => {
      const storedServer = createMockServer({ uuid: "stored-server", host: "stored.lan" });
      const storedOptions = ExtensionOptions.create({
        servers: { "stored-server": storedServer },
        captureServer: "stored-server",
        minFileSizeInBytes: 4096,
        excludedProtocols: ["ftp"],
        excludedSites: ["blocked.com"],
        excludedFileTypes: ["zip"],
        useCompleteFilePath: true,
        notifyUrlIsAdded: false,
        notifyFileIsAdded: false,
        notifyErrorOccurs: false,
        theme: Theme.Dark,
      });
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({ options: ExtensionOptions.serialize(storedOptions) });
      (browser.storage as any).managed = { get: vi.fn().mockResolvedValue({ captureDownloads: true }) };

      const options = await loadOptions();

      expect(options).toEqual({ ...storedOptions, captureDownloads: true });
    });

    it("should silently ignore managed storage when no policy is configured", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});
      (browser.storage as any).managed = { get: vi.fn().mockRejectedValue(new Error("Managed storage manifest not found")) };

      const options = await loadOptions();

      expect(options).toEqual(ExtensionOptions.create());
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should silently ignore managed storage when the API is unavailable", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const options = await loadOptions();

      expect(options).toEqual(ExtensionOptions.create());
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it.each([
      ["a server has no uuid", [{ name: "aria2", host: "aria2.lan" }]],
      ["a server uuid is not a uuid", [{ uuid: "aria2", host: "aria2.lan" }]],
      [
        "server uuids are duplicated",
        [
          { uuid: managedUuid, host: "a.lan" },
          { uuid: managedUuid, host: "b.lan" },
        ],
      ],
    ])("should ignore managed storage and log an error when %s", async (_, servers) => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});
      (browser.storage as any).managed = { get: vi.fn().mockResolvedValue({ servers }) };

      const options = await loadOptions();

      expect(options.servers).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("loadOptions", () => {
    it("should return options from storage", async () => {
      const server = createMockServer({ uuid: "server-id" });
      const storedOptions = ExtensionOptions.create({ servers: { "server-id": server }, captureServer: "server-id", captureDownloads: true });
      const serialized = ExtensionOptions.serialize(storedOptions);

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: serialized,
      });

      const options = await loadOptions();

      expect(options.servers).toEqual(storedOptions.servers);
      expect(options.captureServer).toBe(storedOptions.captureServer);
      expect(options.captureDownloads).toBe(storedOptions.captureDownloads);
    });

    it("should return default options when storage is empty", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const options = await loadOptions();

      expect(options.servers).toEqual({});
      expect(options.captureServer).toBe("");
      expect(options.captureDownloads).toBe(false);
      expect(options.minFileSizeInBytes).toBe(0);
    });

    it("should return default options when options field is missing", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        otherField: "value",
      });

      const options = await loadOptions();

      expect(options.captureServer).toBe("");
    });

    it("should return default options and log the error when stored options are corrupted", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: "not valid json{",
      });

      const options = await loadOptions();

      expect(options.servers).toEqual({});
      expect(options.captureServer).toBe("");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should correctly deserialize all properties from storage", async () => {
      const server = createMockServer({ uuid: "server-1" });
      const storedOptions = ExtensionOptions.create({
        servers: { "server-1": server },
        captureServer: "server-1",
        captureDownloads: true,
        minFileSizeInBytes: 2048,
        excludedProtocols: ["ftp"],
        excludedSites: ["blocked.com"],
        excludedFileTypes: ["zip"],
        useCompleteFilePath: true,
        notifyUrlIsAdded: true,
        notifyFileIsAdded: true,
        notifyErrorOccurs: false,
      });
      const serialized = ExtensionOptions.serialize(storedOptions);

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: serialized,
      });

      const options = await loadOptions();

      expect(options.captureDownloads).toBe(true);
      expect(options.minFileSizeInBytes).toBe(2048);
      expect(options.excludedProtocols).toEqual(["ftp"]);
      expect(options.excludedSites).toEqual(["blocked.com"]);
      expect(options.excludedFileTypes).toEqual(["zip"]);
      expect(options.useCompleteFilePath).toBe(true);
      expect(options.notifyUrlIsAdded).toBe(true);
      expect(options.notifyFileIsAdded).toBe(true);
      expect(options.notifyErrorOccurs).toBe(false);
    });
  });

  describe("createOptionsStore", () => {
    let store: OptionsStore;

    afterEach(() => {
      store.dispose();
    });

    it("should return the defaults until the options are loaded, then the stored options", async () => {
      const storedOptions = ExtensionOptions.create({ captureDownloads: true });
      fakeSyncStorage(storedOptions);

      store = createOptionsStore();

      expect(store.get()).toEqual(ExtensionOptions.create());
      expect(await store.ready()).toEqual(storedOptions);
      expect(store.get()).toEqual(storedOptions);
    });

    it("should wait for the options to be loaded before resolving ready", async () => {
      let resolveStorage: (value: Record<string, unknown>) => void = () => {};
      vi.mocked(browser.storage.sync.get).mockReturnValueOnce(new Promise((resolve) => (resolveStorage = resolve)));
      store = createOptionsStore();
      const onReady = vi.fn();

      const ready = store.ready().then(onReady);
      await Promise.resolve();
      expect(onReady).not.toHaveBeenCalled();

      resolveStorage({ options: ExtensionOptions.serialize(ExtensionOptions.create({ captureDownloads: true })) });
      await ready;
      expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ captureDownloads: true }));
    });

    it("should keep the defaults and log the error when storage cannot be read", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockRejectedValueOnce(new Error("storage error"));

      store = createOptionsStore();

      expect(await store.ready()).toEqual(ExtensionOptions.create());
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should save updates and notify subscribers", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();
      const listener = vi.fn();
      store.subscribe(listener);

      const updated = await store.update((options) => ExtensionOptions.withOverrides(options, { captureDownloads: true }));

      expect(updated.captureDownloads).toBe(true);
      expect(storage.stored().captureDownloads).toBe(true);
      expect(store.get().captureDownloads).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(updated);
    });

    it("should apply updates to the latest stored options instead of a stale copy", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();
      await store.ready();
      // Another page changes the theme, and this store has not reloaded yet.
      storage.writeFromElsewhere(ExtensionOptions.create({ theme: Theme.Dark }));

      await store.update((options) => ExtensionOptions.withOverrides(options, { captureDownloads: true }));

      expect(storage.stored()).toEqual(ExtensionOptions.create({ theme: Theme.Dark, captureDownloads: true }));
    });

    it("should apply concurrent updates one after the other", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();

      await Promise.all([
        store.update((options) => ExtensionOptions.withOverrides(options, { captureDownloads: true })),
        store.update((options) => ExtensionOptions.withOverrides(options, { useCompleteFilePath: true })),
      ]);

      expect(storage.stored()).toEqual(ExtensionOptions.create({ captureDownloads: true, useCompleteFilePath: true }));
    });

    it("should notify subscribers when the options are changed elsewhere", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();
      await store.ready();
      const listener = vi.fn();
      store.subscribe(listener);

      storage.writeFromElsewhere(ExtensionOptions.create({ captureDownloads: true }));

      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(expect.objectContaining({ captureDownloads: true })));
      expect(store.get().captureDownloads).toBe(true);
    });

    it("should not notify subscribers when the options did not change", async () => {
      const storage = fakeSyncStorage(ExtensionOptions.create({ captureDownloads: true }));
      store = createOptionsStore();
      await store.ready();
      const listener = vi.fn();
      store.subscribe(listener);

      storage.writeFromElsewhere(ExtensionOptions.create({ captureDownloads: true }));
      await store.update((options) => options);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should stop notifying a subscriber once unsubscribed", async () => {
      fakeSyncStorage();
      store = createOptionsStore();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      await store.update((options) => ExtensionOptions.withOverrides(options, { captureDownloads: true }));

      expect(listener).not.toHaveBeenCalled();
    });

    it("should stop listening to storage once disposed", async () => {
      fakeSyncStorage();
      store = createOptionsStore();

      store.dispose();

      expect(browser.storage.onChanged.removeListener).toHaveBeenCalledWith(vi.mocked(browser.storage.onChanged.addListener).mock.calls[0][0]);
    });
  });
});
