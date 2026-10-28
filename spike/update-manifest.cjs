// The spike mirrors only exact npm bytes; no third-party runtime is committed.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['index.html', 'page.mjs', 'worker.js', 'runtime-files.json', '../vendor/hashbin-sdk-v0.3.0.mjs',
  ...['webr-worker.js', 'R.js', 'R.wasm', ...require('./runtime-files.json')].map(name => '../node_modules/webr/dist/' + name)];
const hashes = Object.fromEntries(files.map(name => [name, createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, name))).digest('hex')]));
fs.writeFileSync(path.join(__dirname, 'offline-manifest.json'), JSON.stringify({hashes}, null, 2) + '\n');
