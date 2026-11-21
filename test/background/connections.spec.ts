import Aria2 from "@baptistecdr/aria2";
import { describe, expect, it } from "vitest";
import { createConnections } from "@/background/connections";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import { fakeOptionsStore } from "../helpers/fake-options-store";

describe("Connections", () => {
  it("should create one connection per server", () => {
    const store = fakeOptionsStore({ servers: { server1: Server.create(), server2: Server.create() } });

    const all = createConnections(store).all();

    expect(all.map(([server]) => server)).toEqual(Object.values(store.get().servers));
    expect(all[0][1]).toBeInstanceOf(Aria2);
    expect(all[1][1]).toBeInstanceOf(Aria2);
  });

  it("should return undefined for an unknown server", () => {
    const connections = createConnections(fakeOptionsStore());

    expect(connections.get("unknown")).toBeUndefined();
  });

  it("should reuse the connection while the server settings do not change", () => {
    const store = fakeOptionsStore({ servers: { server1: Server.create() } });
    const connections = createConnections(store);

    expect(connections.get("server1")).toBe(connections.get("server1"));
  });

  it("should create a new connection when the server settings change", async () => {
    const store = fakeOptionsStore({ servers: { server1: Server.create({ port: 6800 }) } });
    const connections = createConnections(store);
    const before = connections.get("server1");

    await store.update((options) => ExtensionOptions.withOverrides(options, { servers: { server1: Server.create({ port: 6801 }) } }));

    expect(connections.get("server1")).not.toBe(before);
  });

  it("should follow servers added and removed from the options", async () => {
    const store = fakeOptionsStore();
    const connections = createConnections(store);

    await store.update((options) => ExtensionOptions.withOverrides(options, { servers: { server1: Server.create() } }));
    expect(connections.get("server1")).toBeInstanceOf(Aria2);

    await store.update((options) => ExtensionOptions.withOverrides(options, { servers: {} }));
    expect(connections.get("server1")).toBeUndefined();
  });
});
