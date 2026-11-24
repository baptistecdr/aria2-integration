import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async () => {
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
    delete process.env.OUT_DIR;
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
        strict_min_version: "142.0",
        data_collection_permissions: {
          required: ["none"],
        },
      },
      gecko_android: {
        id: "baptistecdr@users.noreply.github.com",
        strict_min_version: "142.0",
        data_collection_permissions: {
          required: ["none"],
        },
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

  it("should use SVG icons from 48 px and an SVG toolbar icon from 24 px in Firefox", async () => {
    process.env.BROWSER = "firefox";
    vol.writeFileSync(
      "./public/manifest.json",
      JSON.stringify({
        ...manifest,
        icons: { "16": "icons/icon-browser-16.png", "38": "icons/icon-browser-38.png", "48": "icons/icon-browser-48.png", "128": "icons/icon-browser-128.png" },
        action: { default_icon: { "19": "icons/toolbar-19.png", "24": "icons/toolbar-24.png", "32": "icons/toolbar-32.png" } },
      }),
    );

    await import(scriptPath);

    const parsedManifest = JSON.parse(vol.readFileSync("./dist/manifest.json", "utf8") as string);
    expect(parsedManifest.icons).toEqual({
      "16": "icons/icon-browser-16.png",
      "38": "icons/icon-browser-38.png",
      "48": "icons/icon-browser.svg",
      "128": "icons/icon-browser.svg",
    });
    expect(parsedManifest.action.default_icon).toEqual({
      "19": "icons/toolbar-19.png",
      "24": "icons/toolbar.svg",
      "32": "icons/toolbar.svg",
    });
  });

  it("should not ship the SVG icons in Chromium", async () => {
    process.env.BROWSER = "chromium";
    vol.mkdirSync("./dist/icons");
    vol.writeFileSync("./dist/icons/icon-browser.svg", "<svg/>");
    vol.writeFileSync("./dist/icons/toolbar.svg", "<svg/>");
    vol.writeFileSync("./dist/icons/toolbar-32.png", "png");

    await import(scriptPath);

    expect(vol.readdirSync("./dist/icons")).toEqual(["toolbar-32.png"]);
  });

  it("should write the manifest to OUT_DIR when it is set", async () => {
    process.env.BROWSER = "firefox";
    process.env.OUT_DIR = "./dist-firefox";
    vol.mkdirSync("./dist-firefox");

    await import(scriptPath);

    expect(JSON.parse(vol.readFileSync("./dist-firefox/manifest.json", "utf8") as string).browser_specific_settings).toBeDefined();
    expect(vol.existsSync("./dist/manifest.json")).toBe(false);
  });
});
