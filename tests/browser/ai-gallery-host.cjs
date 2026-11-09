/* Canonical gallery policy and host transport, with no provider or credentials. */
const {chromium,firefox,webkit}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),pin=path.join(root,'vendor/fragment-kit-v0.4.3'),origin='https://r.hashbin.page',host='https://ai.hashbin.page';
(async()=>{
 const engine=process.env.BROWSER||'chromium',browser=await({chromium,firefox,webkit}[engine]).launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),violations=[];
  await page.exposeFunction('recordViolation',text=>violations.push(text));
  await page.addInitScript(()=>addEventListener('securitypolicyviolation',e=>window.recordViolation(e.violatedDirective+' '+e.blockedURI)));
  await context.route(origin+'/**',async route=>{const url=new URL(route.request().url()),file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))return route.abort();const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};try{await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:await fs.readFile(file)});}catch{await route.fulfill({status:404,body:''});}});
  await context.route(host+'/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/v0.4.3/host.html')return route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':'frame-ancestors '+origin},body:'<!doctype html><script type="module" src="/gallery-host.mjs"></script>'});
   if(url.pathname==='/gallery-host.mjs')return route.fulfill({contentType:'text/javascript',body:`import {installAiHost} from '/src/ai/host/protocol.js';installAiHost({allowedOrigins:[${JSON.stringify(origin)}],createClient:async()=>({models:async()=>[],generate:async request=>{const questions=JSON.parse(request.messages.at(-1).content).questions;const choice=Object.keys(questions.sample.criteria)[0];return {json:{answers:{sample:{type:'choice',choice,probabilities:null}}},cost:0,model:'mock',provider:'mock'};},destroy(){}})});`});
   const file=path.resolve(pin,'.'+url.pathname);if(!file.startsWith(pin+path.sep))return route.abort();return route.fulfill({contentType:'text/javascript',body:await fs.readFile(file)});
  });
  await page.goto(origin+'/gallery.html');
  await page.getByRole('button',{name:'AI settings',exact:true}).click();
  for(const period of ['total','day','month'])await page.getByLabel(period+' spending cap',{exact:true}).fill('.01');
  await page.getByRole('button',{name:'Set spending caps',exact:true}).click();await page.locator('#ai-settings .fk-close').click();
  await page.getByLabel('Sample chooser model',{exact:true}).selectOption('openai:gpt-4.1-mini-2025-04-14');await page.getByLabel('What do you want to make?',{exact:true}).fill('print a greeting');await page.getByLabel('Allow sending sample metadata',{exact:true}).check();await page.getByRole('button',{name:'Find a starting point',exact:true}).click();
  await page.locator('.fk-ai-panel a').first().waitFor();assert.match(await page.locator('.fk-ai-panel [role="status"]').innerText(),/Model suggestions/);assert.equal(await page.locator('#search').count(),1);assert.equal(await page.locator('#tag').count(),1);assert.deepEqual(violations,[]);console.log(engine+': canonical gallery host choice passed its real CSP; no paid calls');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
