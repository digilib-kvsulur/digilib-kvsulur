#!/usr/bin/env node
/**
 * generate-android-icons.js
 * Copies public/logos/kv.png into every Android mipmap/drawable slot.
 * No extra npm packages needed - uses only Node built-ins.
 * Run: node scripts/generate-android-icons.js
 */
const fs   = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "public", "logos", "kv.png");
const DSTS = [
  "android/app/src/main/res/mipmap-mdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png",
  "android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png",
  "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png",
  "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png",
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png",
  "android/app/src/main/res/drawable/splash.png",
  "android/app/src/main/res/drawable-port-mdpi/splash.png",
  "android/app/src/main/res/drawable-port-hdpi/splash.png",
  "android/app/src/main/res/drawable-port-xhdpi/splash.png",
  "android/app/src/main/res/drawable-port-xxhdpi/splash.png",
  "android/app/src/main/res/drawable-port-xxxhdpi/splash.png",
  "android/app/src/main/res/drawable-land-mdpi/splash.png",
  "android/app/src/main/res/drawable-land-hdpi/splash.png",
  "android/app/src/main/res/drawable-land-xhdpi/splash.png",
  "android/app/src/main/res/drawable-land-xxhdpi/splash.png",
  "android/app/src/main/res/drawable-land-xxxhdpi/splash.png",
];

if (!fs.existsSync(SRC)) {
  console.error("Source logo not found:", SRC);
  process.exit(1);
}

let copied = 0;
for (const dst of DSTS) {
  const dir = path.dirname(dst);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(SRC, dst);
  copied++;
}
console.log("Copied logo into " + copied + " Android resource slots.");
