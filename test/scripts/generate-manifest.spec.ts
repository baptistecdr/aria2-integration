import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs", async () => {
  const memfs = await vi.importActual("memfs");
  return { default: memfs.fs };
});

const scriptPath = "../../scripts/generate-manifest.js";

const manifest = {
  name: "Test Extension",
  version: "1.0.0",
  manifest_version: 3,
  permissions: ["storage"],
};

describe("generate-manifest", () => {
  beforeEach(() => {
    vol.fromJSON({
      "./public/manifest.json": JSON.stringify(manifest),
    });
    vol.mkdirSync("./dist");
  });

  afterEach(() => {
    delete process.env.BROWSER;
    vol.reset();
    vi.resetModules();
  });

  it("should generate Firefox manifest when BROWSER=firefox", async () => {
    process.env.BROWSER = "firefox";

    await import(scriptPath);

    const writtenContent = vol.readFileSync("./dist/manifest.json", "utf8") as string;
    const parsedManifest = JSON.parse(writtenContent);

    expect(parsedManifest.background).toEqual({
      type: "module",
      scripts: ["js/background.js"],
    });
    expect(parsedManifest.host_permissions).toEqual(["<all_urls>"]);
    expect(parsedManifest.browser_specific_settings).toEqual({
      gecko: {
        id: "baptistecdr@users.noreply.github.com",
        strict_min_version: "115.0",
      },
    });
  });

  it("should generate Chromium manifest when BROWSER=chromium", async () => {
    process.env.BROWSER = "chromium";

    await import(scriptPath);

    const writtenContent = vol.readFileSync("./dist/manifest.json", "utf8") as string;
    const parsedManifest = JSON.parse(writtenContent);

    expect(parsedManifest.background).toEqual({
      type: "module",
      service_worker: "js/background.js",
    });
    expect(parsedManifest.host_permissions).toEqual(["*://*/*"]);
    expect(parsedManifest.browser_specific_settings).toBeUndefined();
  });

  it("should preserve original manifest properties for unknown browser", async () => {
    process.env.BROWSER = "unknown";

    await import(scriptPath);

    const writtenContent = vol.readFileSync("./dist/manifest.json", "utf8") as string;
    const parsedManifest = JSON.parse(writtenContent);

    expect(parsedManifest.name).toBe(manifest.name);
    expect(parsedManifest.version).toBe(manifest.version);
    expect(parsedManifest.background).toBeUndefined();
    expect(parsedManifest.host_permissions).toBeUndefined();
    expect(parsedManifest.browser_specific_settings).toBeUndefined();
  });

  it("should preserve original manifest properties when no BROWSER env is set", async () => {
    await import(scriptPath);

    const writtenContent = vol.readFileSync("./dist/manifest.json", "utf8") as string;
    const parsedManifest = JSON.parse(writtenContent);

    expect(parsedManifest.name).toBe(manifest.name);
    expect(parsedManifest.version).toBe(manifest.version);
    expect(parsedManifest.permissions).toEqual(manifest.permissions);
    expect(parsedManifest.background).toBeUndefined();
  });
});
