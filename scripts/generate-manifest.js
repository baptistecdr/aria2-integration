#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

const rawManifest = fs.readFileSync("./public/manifest.json").toString();
const manifest = JSON.parse(rawManifest);

if (process.env.BROWSER === "firefox") {
  manifest.manifest_version = 2;
  manifest.background = {
    scripts: ["js/background.js"],
  };
  manifest.browser_action = {
    default_popup: "popup.html",
    default_title: "__MSG_extName__",
    default_icon: {
      16: "icons/icon16.png",
      19: "icons/icon19.png",
      24: "icons/icon24.png",
      32: "icons/icon32.png",
      38: "icons/icon38.png",
      48: "icons/icon48.png",
      80: "icons/icon80.png",
      128: "icons/icon128.png",
      256: "icons/icon256.png",
      512: "icons/icon512.png",
    },
  };
  manifest.permissions.push("<all_urls>");
  manifest.browser_specific_settings = {
    gecko: {
      id: "baptistecdr@users.noreply.github.com",
      strict_min_version: "69.0",
    },
  };
} else if (process.env.BROWSER === "chromium") {
  manifest.manifest_version = 3;
  manifest.background = {
    service_worker: "js/background.js",
  };
  manifest.host_permissions = ["*://*/*"];
  manifest.action = {
    default_popup: "popup.html",
    default_title: "__MSG_extName__",
    default_icon: {
      16: "icons/icon16.png",
      19: "icons/icon19.png",
      24: "icons/icon24.png",
      32: "icons/icon32.png",
      38: "icons/icon38.png",
      48: "icons/icon48.png",
      80: "icons/icon80.png",
      128: "icons/icon128.png",
      256: "icons/icon256.png",
      512: "icons/icon512.png",
    },
  };
}

fs.writeFileSync("./build/manifest.json", JSON.stringify(manifest));
