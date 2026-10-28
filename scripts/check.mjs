import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
async function walk(directory){const result=[];for(const e of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,e.name);if(e.isDirectory())result.push(...await walk(file));else result.push(file);}return result;}
for(const dir of ['src','scripts','tests'])for(const file of await walk(path.join(root,dir)))if(/\.(?:js|mjs|cjs)$/.test(file)){
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);
}
for(const sample of require('../src/examples.js').catalog){
 const source=await fs.readFile(path.join(root,'examples',sample.id+'.R'),'utf8');
 if(source!==sample.src||createHash('sha256').update(source).digest('hex')!==sample.fingerprint)throw Error(sample.id+': gallery source/fingerprint stale');
 const svg=await fs.readFile(path.join(root,'gallery/previews',sample.id+'.svg'),'utf8');if(!/<svg/.test(svg))throw Error(sample.id+': SVG preview missing');
}
for(const script of ['render-docs.mjs','update-offline.mjs']){
 const result=spawnSync(process.execPath,[path.join(root,'scripts',script),'--check'],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);process.stdout.write(result.stdout);
}
console.log('Syntax, gallery fingerprints, docs and offline hashes are current.');
