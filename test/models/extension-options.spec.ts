import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { ExtensionOptions } from "@/models/extension-options";
import { Server } from "@/models/server";

describe("ExtensionOptions", () => {
  const createMockServer = (overrides?: Partial<Server>): Server =>
    Server.create({
      uuid: "test-uuid",
      name: "Test Server",
      ...overrides,
    });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("serialize", () => {
    it("should serialize options to JSON string", () => {
      const options = ExtensionOptions.create();
      const serialized = ExtensionOptions.serialize(options);

      expect(typeof serialized).toBe("string");
      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(JSON.parse(serialized)).toHaveProperty("servers");
    });

    it("should preserve all properties when serializing", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
        captureServer: "server-1",
        captureDownloads: true,
        minFileSizeInBytes: 1024,
        excludedProtocols: ["http"],
        excludedSites: ["example.com"],
        excludedFileTypes: ["exe"],
        useCompleteFilePath: true,
        notifyUrlIsAdded: false,
        notifyFileIsAdded: false,
        notifyErrorOccurs: true,
      });

      const serialized = ExtensionOptions.serialize(options);
      const parsed = JSON.parse(serialized);

      expect(parsed.servers).toEqual(options.servers);
      expect(parsed.captureServer).toBe("server-1");
      expect(parsed.captureDownloads).toBe(true);
      expect(parsed.minFileSizeInBytes).toBe(1024);
    });
  });

  describe("toStorage", () => {
    it("should save options to browser storage with correct format", async () => {
      const options = ExtensionOptions.create();
      const serialized = ExtensionOptions.serialize(options);

      await ExtensionOptions.toStorage(options);

      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        options: serialized,
      });
      expect(browser.storage.sync.set).toHaveBeenCalledTimes(1);
    });

    it("should return the same instance after saving", async () => {
      const options = ExtensionOptions.create();
      const result = await ExtensionOptions.toStorage(options);

      expect(result).toBe(options);
    });
  });

  describe("addServer", () => {
    it("should add a server and save to storage", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();

      const newOptions = await ExtensionOptions.addServer(options, server);

      expect(newOptions.servers[server.uuid]).toEqual(server);
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new instance", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();
      const newOptions = await ExtensionOptions.addServer(options, server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve existing servers when adding a new one", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({ servers: { "server-1": server1 } });

      const newOptions = await ExtensionOptions.addServer(options, server2);

      expect(newOptions.servers["server-1"]).toEqual(server1);
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });

    it("should replace existing server with same uuid", async () => {
      const server = createMockServer({ uuid: "server-1", name: "Server 1" });
      const updatedServer = createMockServer({
        uuid: "server-1",
        name: "Updated Server 1",
      });
      const options = ExtensionOptions.create({ servers: { "server-1": server } });

      const newOptions = await ExtensionOptions.addServer(options, updatedServer);

      expect(newOptions.servers["server-1"].name).toBe("Updated Server 1");
    });
  });

  describe("deleteServer", () => {
    it("should delete a server and save to storage", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
      });

      const newOptions = await ExtensionOptions.deleteServer(options, server);

      expect(newOptions.servers[server.uuid]).toBeUndefined();
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new instance", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
      });
      const newOptions = await ExtensionOptions.deleteServer(options, server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve other servers when deleting one", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({
        servers: {
          "server-1": server1,
          "server-2": server2,
        },
      });

      const newOptions = await ExtensionOptions.deleteServer(options, server1);

      expect(newOptions.servers["server-1"]).toBeUndefined();
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });

    it("should clear captureServer and captureDownloads when deleting the current capture target", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({
        servers: {
          "server-1": server1,
          "server-2": server2,
        },
        captureServer: "server-1",
        captureDownloads: true,
      });

      const newOptions = await ExtensionOptions.deleteServer(options, server1);

      expect(newOptions.servers["server-2"]).toEqual(server2);
      expect(newOptions.captureServer).toBe("");
      expect(newOptions.captureDownloads).toBe(false);
    });

    it("should not touch captureServer when deleting a different server", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({
        servers: {
          "server-1": server1,
          "server-2": server2,
        },
        captureServer: "server-1",
        captureDownloads: true,
      });

      const newOptions = await ExtensionOptions.deleteServer(options, server2);

      expect(newOptions.captureServer).toBe("server-1");
      expect(newOptions.captureDownloads).toBe(true);
    });
  });

  describe("withOverrides", () => {
    it("should apply overrides to a copy of options", () => {
      const originalOptions = ExtensionOptions.create({ captureServer: "server-1", captureDownloads: false, minFileSizeInBytes: 512 });

      const overriddenOptions = ExtensionOptions.withOverrides(originalOptions, {
        captureDownloads: true,
        minFileSizeInBytes: 1024,
      });

      expect(overriddenOptions.captureDownloads).toBe(true);
      expect(overriddenOptions.minFileSizeInBytes).toBe(1024);
      expect(overriddenOptions.captureServer).toBe("server-1");
      expect(overriddenOptions).not.toBe(originalOptions);
    });

    it("should not modify original options", () => {
      const originalOptions = ExtensionOptions.create({ minFileSizeInBytes: 512 });

      ExtensionOptions.withOverrides(originalOptions, {
        minFileSizeInBytes: 1024,
      });

      expect(originalOptions.minFileSizeInBytes).toBe(512);
    });
  });

  describe("fromStorage", () => {
    it("should return options from storage", async () => {
      const server = createMockServer({ uuid: "server-id" });
      const storedOptions = ExtensionOptions.create({ servers: { "server-id": server }, captureServer: "server-id", captureDownloads: true });
      const serialized = ExtensionOptions.serialize(storedOptions);

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: serialized,
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options.servers).toEqual(storedOptions.servers);
      expect(options.captureServer).toBe(storedOptions.captureServer);
      expect(options.captureDownloads).toBe(storedOptions.captureDownloads);
    });

    it("should return default options when storage is empty", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const options = await ExtensionOptions.fromStorage();

      expect(options.servers).toEqual({});
      expect(options.captureServer).toBe("");
      expect(options.captureDownloads).toBe(false);
      expect(options.minFileSizeInBytes).toBe(0);
    });

    it("should return default options when options field is missing", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        otherField: "value",
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options.captureServer).toBe("");
    });

    it("should return default options and log the error when stored options are corrupted", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: "not valid json{",
      });

      const options = await ExtensionOptions.fromStorage();

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

      const options = await ExtensionOptions.fromStorage();

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
});
