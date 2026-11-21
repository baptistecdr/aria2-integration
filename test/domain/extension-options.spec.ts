import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";

describe("ExtensionOptions", () => {
  const createMockServer = (overrides?: Partial<Server>): Server =>
    Server.create({
      uuid: "test-uuid",
      name: "Test Server",
      ...overrides,
    });

  beforeEach(() => {
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

  describe("withServer", () => {
    it("should add a server", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();

      const newOptions = ExtensionOptions.withServer(options, server);

      expect(newOptions.servers[server.uuid]).toEqual(server);
    });

    it("should return a new instance", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();
      const newOptions = ExtensionOptions.withServer(options, server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve existing servers when adding a new one", () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({ servers: { "server-1": server1 } });

      const newOptions = ExtensionOptions.withServer(options, server2);

      expect(newOptions.servers["server-1"]).toEqual(server1);
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });

    it("should replace existing server with same uuid", () => {
      const server = createMockServer({ uuid: "server-1", name: "Server 1" });
      const updatedServer = createMockServer({
        uuid: "server-1",
        name: "Updated Server 1",
      });
      const options = ExtensionOptions.create({ servers: { "server-1": server } });

      const newOptions = ExtensionOptions.withServer(options, updatedServer);

      expect(newOptions.servers["server-1"].name).toBe("Updated Server 1");
    });
  });

  describe("withoutServer", () => {
    it("should delete a server", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
      });

      const newOptions = ExtensionOptions.withoutServer(options, server);

      expect(newOptions.servers[server.uuid]).toBeUndefined();
    });

    it("should return a new instance", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
      });
      const newOptions = ExtensionOptions.withoutServer(options, server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve other servers when deleting one", () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({
        servers: {
          "server-1": server1,
          "server-2": server2,
        },
      });

      const newOptions = ExtensionOptions.withoutServer(options, server1);

      expect(newOptions.servers["server-1"]).toBeUndefined();
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });

    it("should clear captureServer and captureDownloads when deleting the current capture target", () => {
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

      const newOptions = ExtensionOptions.withoutServer(options, server1);

      expect(newOptions.servers["server-2"]).toEqual(server2);
      expect(newOptions.captureServer).toBe("");
      expect(newOptions.captureDownloads).toBe(false);
    });

    it("should not touch captureServer when deleting a different server", () => {
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

      const newOptions = ExtensionOptions.withoutServer(options, server2);

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
});
