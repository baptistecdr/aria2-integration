import { describe, expect, it } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import Theme from "@/domain/theme";
import { applyExtensionOptionsFormValues, formatList, parseList, toExtensionOptionsFormValues } from "@/options/models/extension-options-form";

describe("extension options form", () => {
  it.each([
    ["zip, rar", ["zip", "rar"]],
    ["  zip ,rar,, 7z  ", ["zip", "rar", "7z"]],
    ["", []],
    [" , ", []],
  ])("parses the list %j", (text, list) => {
    expect(parseList(text)).toEqual(list);
  });

  it("formats a list as comma separated text", () => {
    expect(formatList(["zip", "rar"])).toBe("zip, rar");
  });

  it.each([
    [0, 0, 0],
    [512, 512, 0],
    [2048, 2, 1],
    [5 * 1024 ** 2, 5, 2],
    [3 * 1024 ** 3, 3, 3],
  ])("shows a minimum size of %i bytes as %i with the unit %i", (bytes, size, exponent) => {
    const values = toExtensionOptionsFormValues(ExtensionOptions.create({ minFileSizeInBytes: bytes }));

    expect(values.minFileSize).toBe(size);
    expect(values.minFileSizeExponent).toBe(exponent);
  });

  it("gives back the same options when the form is not changed", () => {
    const options = ExtensionOptions.create({
      servers: { server1: Server.create({ uuid: "server1" }) },
      captureServer: "server1",
      captureDownloads: true,
      minFileSizeInBytes: 2048,
      excludedProtocols: ["ftp"],
      excludedSites: ["example.com", "microsoft"],
      excludedFileTypes: ["zip"],
      useCompleteFilePath: true,
      notifyUrlIsAdded: false,
      notifyFileIsAdded: false,
      notifyErrorOccurs: false,
      theme: Theme.Dark,
    });

    expect(applyExtensionOptionsFormValues(options, toExtensionOptionsFormValues(options))).toEqual(options);
  });

  it("keeps the servers of the options", () => {
    const options = ExtensionOptions.create({ servers: { server1: Server.create({ uuid: "server1" }) } });
    const values = { ...toExtensionOptionsFormValues(ExtensionOptions.create()), excludedSites: "a.com, b.com" };

    const applied = applyExtensionOptionsFormValues(options, values);

    expect(applied.servers).toEqual(options.servers);
    expect(applied.excludedSites).toEqual(["a.com", "b.com"]);
  });
});
