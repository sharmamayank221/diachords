// Removes website-only files from the static export before it's copied into the iOS app.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../out");
const removable = (name) =>
  name === "sw.js" ||
  name === "robots.txt" ||
  name === "manifest.json" ||
  /^workbox-.*\.js$/.test(name) ||
  /^google[0-9a-f]+\.html$/.test(name);

let removed = 0;
for (const name of fs.readdirSync(out)) {
  if (removable(name)) {
    fs.rmSync(path.join(out, name), { force: true });
    removed++;
  }
}
console.log(`Pruned ${removed} website-only files from out/`);
