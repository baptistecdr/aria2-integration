import fs from "node:fs";

const rawManifest = fs.readFileSync("./public/manifest.json").toString();
const manifest = JSON.parse(rawManifest);
const outDir = process.env.OUT_DIR || "./dist";

// Points every size from `minSize` up to an SVG. The smaller PNGs stay: they are drawn for the pixel grid.
const withSvg = (icons, svg, minSize) => Object.fromEntries(Object.entries(icons).map(([size, png]) => [size, Number(size) >= minSize ? svg : png]));

if (process.env.BROWSER === "firefox") {
  // Firefox supports SVG icons, which stay sharp at any zoom level and pixel density.
  manifest.icons = withSvg(manifest.icons, "icons/icon-browser.svg", 48);
  manifest.action.default_icon = withSvg(manifest.action.default_icon, "icons/toolbar.svg", 24);
  manifest.background = {
    type: "module",
    scripts: ["js/background.js"],
  };
  manifest.host_permissions = ["<all_urls>"];
  manifest.browser_specific_settings = {
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
  };
} else if (process.env.BROWSER === "chromium") {
  manifest.background = {
    type: "module",
    service_worker: "js/background.js",
  };
  manifest.host_permissions = ["*://*/*"];
  manifest.storage = { managed_schema: "managed-schema.json" };
  // Chromium only accepts bitmap icons, so the SVGs are not shipped.
  for (const svg of ["icon-browser.svg", "toolbar.svg"]) {
    fs.rmSync(`${outDir}/icons/${svg}`, { force: true });
  }
}

fs.writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2));
