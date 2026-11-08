import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {generateOffline} from '../vendor/fragment-kit-v0.3.5/tools/offline-assets.mjs';
const check=process.argv.includes('--check'),webr='https://cdn.jsdelivr.net/npm/webr@0.6.0/dist/';
const config=JSON.parse(await fs.readFile('offline.config.json','utf8'));
const runtime=JSON.parse(await fs.readFile('src/runtime-files.json','utf8')),remote={};
for(const name of [...new Set(['webr-worker.js','R.js','R.wasm',...runtime.startup,...runtime.lazy])].sort())remote[webr+name]=createHash('sha256').update(await fs.readFile('node_modules/webr/dist/'+name)).digest('hex');
const packages=JSON.parse(await fs.readFile('scripts/package-hashes.json','utf8'));
const expected={...config,remote,metadata:{webr,packageHashes:packages.hashes}};
if(check){if(JSON.stringify(expected)!==JSON.stringify(config))throw Error('Runtime/package pins changed. Run npm run offline.');}
else await fs.writeFile('offline.config.json',JSON.stringify(expected,null,2)+'\n');
const source=JSON.stringify(remote,null,2)+'\n';
if(check){if(await fs.readFile('scripts/remote-hashes.json','utf8')!==source)throw Error('Remote hashes are stale.');}
else await fs.writeFile('scripts/remote-hashes.json',source);
const manifest=await generateOffline('offline.config.json',check);console.log(manifest.version+': '+manifest.assets.length+' verified assets');
