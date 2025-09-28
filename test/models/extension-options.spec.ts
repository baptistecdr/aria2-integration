import { describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import ExtensionOptions from "@/models/extension-options";
import type Server from "@/models/server";

describe("ExtensionOptions", () => {
  const server: Server = {
    uuid: "test-uuid",
    name: "Test Server",
    rpcParameters: {},
  } as Server;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("toStorage", () => {
    it("should save options to browser storage", async () => {
      const options = new ExtensionOptions();
      const serialized = options.serialize();

      await options.toStorage();

      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        options: serialized,
      });
    });

    it("should return the same instance after saving", async () => {
      const options = new ExtensionOptions();
      const result = await options.toStorage();

      expect(result).toBe(options);
    });
  });

  describe("addServer", () => {
    it("should add a server and save to storage", async () => {
      const options = new ExtensionOptions();
      const newOptions = await options.addServer(server);

      expect(newOptions.servers[server.uuid]).toEqual(server);
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new instance", async () => {
      const options = new ExtensionOptions();
      const newOptions = await options.addServer(server);

      expect(newOptions).not.toBe(options);
    });
  });

  describe("deleteServer", () => {
    it("should delete a server and save to storage", async () => {
      const options = new ExtensionOptions({
        [server.uuid]: server,
      });

      const newOptions = await options.deleteServer(server);

      expect(newOptions.servers[server.uuid]).toBeUndefined();
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new instance", async () => {
      const options = new ExtensionOptions({
        [server.uuid]: server,
      });
      const newOptions = await options.deleteServer(server);

      expect(newOptions).not.toBe(options);
    });
  });

  describe("fromStorage", () => {
    it("should return options from storage", async () => {
      const storedOptions = new ExtensionOptions({ "server-id": server }, "server-id", true);
      const serialized = storedOptions.serialize();

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({ options: serialized });

      const options = await ExtensionOptions.fromStorage();

      expect(options).toBeInstanceOf(ExtensionOptions);
      expect(options.servers).toEqual(storedOptions.servers);
      expect(options.captureServer).toBe(storedOptions.captureServer);
      expect(options.captureDownloads).toBe(storedOptions.captureDownloads);
    });

    it("should return default options when storage is empty", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const options = await ExtensionOptions.fromStorage();

      expect(options).toBeInstanceOf(ExtensionOptions);
      expect(options.servers).toEqual({});
      expect(options.captureServer).toBe("");
    });
  });
});
