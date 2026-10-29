import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),cache=path.join(root,'.webr-cache');
await fs.mkdir(cache,{recursive:true});
const base='https://repo.r-wasm.org/bin/emscripten/contrib/4.6/';
const useCache=process.argv.includes('--verify')||process.argv.includes('--cached');
async function get(name){const file=path.join(cache,name);if(useCache){try{return await fs.readFile(file);}catch{}}
 const response=await fetch(base+name);if(!response.ok)throw Error('HTTP '+response.status+': '+name);const data=Buffer.from(await response.arrayBuffer());await fs.writeFile(file,data);return data;}
if(process.argv.includes('--verify')){
 const pin=JSON.parse(await fs.readFile(path.join(root,'scripts/package-hashes.json')));
 for(const [url,expected]of Object.entries(pin.hashes)){
  const bytes=await get(url.split('/').at(-1));if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Package update available — run npm run gallery: '+url);
 }
 console.log('Pinned gallery packages verified.');
}else{
const text=(await get('PACKAGES')).toString(),records=new Map();
for(const block of text.replace(/\n[ \t]+/g,' ').split(/\n\s*\n/)){
 const fields=Object.fromEntries(block.split('\n').map(line=>{const i=line.indexOf(':');return[line.slice(0,i),line.slice(i+1).trim()];}));if(fields.Package)records.set(fields.Package,fields);
}
const selected=new Set();
function add(name){if(selected.has(name)||!records.has(name))return;selected.add(name);const p=records.get(name);for(const dep of ((p.Depends||'')+','+(p.Imports||'')).split(',')){const n=dep.trim().split(/[ (]/)[0];if(n&&n!=='R')add(n);}}
['ggplot2','dplyr','tidyr','jsonlite','knitr'].forEach(add);
const hashes={},packages={};
const names=[...[...selected].sort().map(name=>{const p=records.get(name),file=p.File||`${name}_${p.Version}.tgz`;packages[name]={version:p.Version,file};return file;})];
for(const name of names){const bytes=await get(name);hashes[base+name]=createHash('sha256').update(bytes).digest('hex');console.log(name+' '+bytes.length);}
const selectedRecords=text.split(/\n\s*\n/).filter(block=>selected.has(block.match(/^Package: (.+)$/m)?.[1]));
await fs.writeFile(path.join(root,'src/gallery-packages.dcf'),selectedRecords.join('\n\n')+'\n');
await fs.writeFile(path.join(root,'scripts/package-hashes.json'),JSON.stringify({repository:base,packages,hashes},null,2)+'\n');
console.log(selected.size+' pinned gallery packages');

}
