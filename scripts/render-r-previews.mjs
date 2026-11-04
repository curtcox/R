import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createNodeCore} from '../src/r-node.mjs';
import './pin-packages.mjs';
const require=createRequire(import.meta.url),{catalog}=require('../src/examples.js');
const root=path.resolve(import.meta.dirname,'..');
await fs.mkdir(path.join(root,'gallery/previews'),{recursive:true});
const escape=text=>String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function consoleSVG(sample,events){
 const text=events.filter(x=>x.type==='text').map(x=>x.text).join('')||(events.some(x=>x.type==='html')?'HTML table — open in editor to explore':events.some(x=>x.type==='markdown')?'Rich Markdown — open in editor to explore':'Saved function — open in editor to explore');
 const lines=text.split('\n').slice(0,15).map(line=>line.slice(0,72));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f5faf8"/><path d="M0 0H640V58H0Z" fill="#167c80"/><text x="26" y="37" fill="white" font-family="sans-serif" font-size="20">${escape(sample.label)}</text><g fill="#1c343b" font-family="monospace" font-size="13">${lines.map((line,i)=>`<text x="26" y="${94+i*22}">${escape(line)}</text>`).join('')}</g></svg>\n`;
}
let events=[];const runtime=await createNodeCore(x=>events.push(x));
try{
 for(const sample of catalog){
  const source=await fs.readFile(path.join(root,'examples',sample.id+'.R'),'utf8');
  if(source!==sample.src)throw Error(sample.id+': source differs from examples.js');
  events=[];const result=await runtime.core.run({id:1,source,stdin:sample.stdin});
  if(!result.ok)throw Error(sample.id+': '+result.error);
  const image=events.find(x=>x.type==='figure'||x.type==='svg');
  await fs.writeFile(path.join(root,'gallery/previews',sample.id+'.svg'),image?(image.svg||image.data):consoleSVG(sample,events));
  sample.fingerprint=createHash('sha256').update(source).digest('hex');
  console.log('Rendered '+sample.id);
 }
 await fs.writeFile(path.join(root,'src/examples.js'),'/* Sources mirror examples/*.R. Regenerate previews with npm run gallery. */\nconst RExamples = {catalog: '+JSON.stringify(catalog,null,2)+'};\nif(typeof module!=="undefined")module.exports=RExamples;else globalThis.RExamples=RExamples;\n');
}finally{await runtime.close();}
