// Builds the iOS app icon (1024×1024, opaque) and launch image from public/Logo.svg.
// Run: node scripts/generate-ios-assets.js
const sharp = require("sharp");
const path = require("path");

const logo = path.join(__dirname, "../public/Logo.svg");
const assets = path.join(__dirname, "../ios/App/App/Assets.xcassets");
const GREEN = { r: 0x1b, g: 0xd7, b: 0x9e };

async function icon() {
  // The logo's green circle blends into the green background, leaving the white mark,
  // which iOS then masks to its rounded square.
  const size = 1024;
  const mark = await sharp(logo, { density: 2400 }).resize(size, size).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: GREEN } })
    .composite([{ input: mark }])
    .flatten({ background: GREEN })
    .removeAlpha()
    .png()
    .toFile(path.join(assets, "AppIcon.appiconset/AppIcon-512@2x.png"));
}

async function splash() {
  const size = 2732;
  const logoSize = 360;
  const mark = await sharp(logo, { density: 1200 }).resize(logoSize, logoSize).png().toBuffer();
  const image = await sharp({ create: { width: size, height: size, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
  for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    await sharp(image).toFile(path.join(assets, "Splash.imageset", name));
  }
}

Promise.all([icon(), splash()]).then(() => console.log("iOS icon and splash written"));
