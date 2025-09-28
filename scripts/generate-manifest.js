#!/usr/bin/env node

import fs from "node:fs";

const rawManifest = fs.readFileSync("./public/manifest.json").toString();
const manifest = JSON.parse(rawManifest);

if (process.env.BROWSER === "firefox") {
  manifest.background = {
    type: "module",
    scripts: ["js/background.js"],
  };
  manifest.host_permissions = ["<all_urls>"];
  manifest.browser_specific_settings = {
    gecko: {
      id: "baptistecdr@users.noreply.github.com",
      strict_min_version: "115.0",
    },
  };
} else if (process.env.BROWSER === "chromium") {
  manifest.background = {
    type: "module",
    service_worker: "js/background.js",
  };
  manifest.host_permissions = ["*://*/*"];
}

fs.writeFileSync("./dist/manifest.json", JSON.stringify(manifest, null, 2));
