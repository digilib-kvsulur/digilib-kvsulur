const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');

async function main() {
  const img = await Jimp.read('public/logos/kv.png');
  img.resize(256, 256);
  await img.writeAsync('public/logos/kv-square.png');
  const buf = await pngToIco.default('public/logos/kv-square.png');
  fs.writeFileSync('public/logos/kv.ico', buf);
  console.log('kv.ico generated!');
}

main().catch(console.error);
