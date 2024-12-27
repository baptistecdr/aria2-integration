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
const filesToUpdate = ["public/manifest.json"];

for (const file of filesToUpdate) {
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      console.error(`Unable to read the content of the file '${file}'. (${err})`);
    } else {
      const content = JSON.parse(data);
      if (file === "public/manifest.json") {
        content.version = version.replaceAll(/-SNAPSHOT\.\d+/g, "");
        content.version_name = version;
      } else {
        content.version = version;
      }
      fs.writeFile(file, `${JSON.stringify(content, null, 2)}\n`, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    }
  });
}
