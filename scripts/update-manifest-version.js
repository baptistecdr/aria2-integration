#!/usr/bin/env node

import fs from "node:fs";

if (process.argv.length <= 2) {
  console.error("You need to specify a new version.");
  process.exit();
}
let version = process.argv[2].trim();
if (version.startsWith("v")) {
  version = version.substring(1);
}

const manifestFile = "public/manifest.json";

try {
  const rawContent = fs.readFileSync(manifestFile, "utf8");
  const content = JSON.parse(rawContent);
  content.version = version.replaceAll(/-SNAPSHOT\.\d+/g, "");
  content.version_name = version;
  fs.writeFileSync(manifestFile, `${JSON.stringify(content, null, 2)}\n`);
} catch (e) {
  console.error(`Unable to read/write the content of the file '${manifestFile}'. (${e})`);
}
