import { describe, expect, it } from "vitest";
import { Server } from "@/domain/server";
import { ServerIncognitoModeOptions } from "@/domain/server-incognito-mode-options";
import { formatPath, formatRpcParameters, fromServerFormValues, parseRpcParameters, serverUrl, toServerFormValues } from "@/options/models/server-form";

describe("server form", () => {
  it.each([
    ["jsonrpc", "/jsonrpc"],
    ["/jsonrpc", "/jsonrpc"],
    ["", "/"],
  ])("formats the path %j as %j", (path, formatted) => {
    expect(formatPath(path)).toBe(formatted);
  });

  it("formats RPC parameters as one line per parameter", () => {
    expect(formatRpcParameters({ split: "5", "all-proxy": "http://proxy:8080" })).toBe("split: 5\nall-proxy: http://proxy:8080");
  });

  it("parses RPC parameters, keeping the colons of their values", () => {
    expect(parseRpcParameters("split: 5\nall-proxy: http://proxy:8080")).toEqual({ split: "5", "all-proxy": "http://proxy:8080" });
  });

  it("ignores empty lines and parameters without a value", () => {
    expect(parseRpcParameters("\nsplit: 5\n\ndir:\n  ")).toEqual({ split: "5" });
  });

  it.each([
    [{ secure: false, host: "localhost", port: 6800, path: "/jsonrpc" }, "http://localhost:6800/jsonrpc"],
    [{ secure: true, host: "nas.local", port: 443, path: "/rpc" }, "https://nas.local/rpc"],
    [{ secure: false, host: "", port: 6800, path: "/jsonrpc" }, null],
  ])("builds the URL of %j", (values, url) => {
    expect(serverUrl(values)?.toString() ?? null).toBe(url);
  });

  it("gives back the same server when the form is not changed", () => {
    const server = Server.create({
      uuid: "server1",
      name: "NAS",
      secure: true,
      host: "nas.local",
      port: 6801,
      path: "/rpc",
      secret: "s3cr3t",
      rpcParameters: { split: "5" },
      incognitoModeOptions: ServerIncognitoModeOptions.create({
        automaticallyPurgeDownloads: true,
        overwriteRpcParameters: true,
        rpcParameters: { split: "1" },
      }),
    });

    expect(fromServerFormValues(server.uuid, toServerFormValues(server))).toEqual(server);
  });
});
