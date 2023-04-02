#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

if (process.argv.length <= 2) {
  console.error("You need to specify a new version.");
  process.exit();
}
let version = process.argv[2].trim();
if (version.startsWith("v")) {
  version = version.substring(1);
}
const filesToUpdate = ["package.json", "public/manifest.json", "package-lock.json"];

filesToUpdate.forEach((file) => {
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      console.error(`Unable to read the content of the file '${file}'. (${err})`);
    } else {
      const content = JSON.parse(data);
      content.version = version;
      fs.writeFile(file, `${JSON.stringify(content, null, 2)}\n`, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    }
  });
});
