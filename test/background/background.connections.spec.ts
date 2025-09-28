// @ts-expect-error No types available
import Aria2 from "@baptistecdr/aria2";
import { expect } from "vitest";
import { createConnections } from "@/background/background";
import ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";

describe("Connections", () => {
  it("should create one connection per server", () => {
    const extensionOptions = new ExtensionOptions({
      server1: new Server(),
      server2: new Server(),
    });

    const result = createConnections(extensionOptions);

    expect(Object.keys(result)).toEqual(["server1", "server2"]);
    expect(result.server1).toBeInstanceOf(Aria2);
    expect(result.server2).toBeInstanceOf(Aria2);
  });
});
