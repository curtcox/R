// Development-only rasterization of our original SVG; no generated trademark artwork.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);await fs.mkdir(new URL('icons/',root),{recursive:true});
const svg=await fs.readFile(new URL('icon.svg',root),'utf8'),browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();for(const size of [180,192,512]){await page.setViewportSize({width:size,height:size});await page.setContent('<style>html,body{margin:0}svg{width:100vw;height:100vh;display:block}</style>'+svg);await page.screenshot({path:new URL('icons/icon-'+size+'.png',root).pathname});}}
finally{await browser.close();}
