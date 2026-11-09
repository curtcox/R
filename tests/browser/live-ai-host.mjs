// Manual only: actual deployed host, synthetic key, mocked provider; no paid calls.
import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('vendor/fragment-kit-v0.4.3'),hostOrigin='https://ai.hashbin.page',appOrigin='https://r.hashbin.page';
const hostURL=hostOrigin+'/v0.4.3/host.html',ref='openai:gpt-4.1-mini-2025-04-14',key='synthetic-host-acceptance-key';
const records=[];
await fs.mkdir('test-results',{recursive:true});
const selectedEngine=process.env.BROWSER||'chromium';
if(!['chromium','firefox','webkit'].includes(selectedEngine))throw Error('Unknown browser.');
for(const [engine,launcher] of Object.entries({[selectedEngine]:{chromium,firefox,webkit}[selectedEngine]})){
 const browser=await launcher.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await context.route(appOrigin+'/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/__fragment_ai_probe')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Deployed AI host acceptance</title>'});
   if(!url.pathname.startsWith('/kit/'))return route.abort();
   const file=path.resolve(root,url.pathname.slice(5));if(!file.startsWith(root+path.sep))return route.abort();
   return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body:await fs.readFile(file)});
  });
  let providerCalls=0;
  await context.route('https://api.openai.com/v1/chat/completions',async route=>{assert.equal(route.request().headers().authorization,'Bearer '+key);providerCalls++;return route.fulfill({json:{model:'synthetic-provider-response',choices:[{message:{content:'Live host transport passed'},finish_reason:'stop'}],usage:{prompt_tokens:5,completion_tokens:4}}});});
  await page.goto(hostURL);
  await page.locator('#host-status').filter({hasText:'Open AI settings'}).waitFor();
  await page.evaluate(async()=>{localStorage.setItem('fragment-kit-ai-probe:storage','probe');await(await caches.open('fragment-kit-ai-probe')).put('/fragment-kit-ai-probe',new Response('probe'));await new Promise((resolve,reject)=>{const q=indexedDB.open('fragment-kit-ai-probe',1);q.onupgradeneeded=()=>q.result.createObjectStore('probe');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('probe','readwrite');tx.objectStore('probe').put('probe','probe');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});});
  await page.goto(appOrigin+'/__fragment_ai_probe');
  await page.evaluate(async({hostOrigin,ref})=>{const {createAi}=await import('/kit/src/ai/index.js');window.probeAi=await createAi({config:{name:'Production transport probe',storagePrefix:'fragment-kit-ai-probe-parent',canonicalOrigin:location.origin+'/',ai:{deployments:{[location.origin+'/']:{connection:'host',host:hostOrigin+'/v0.4.3/'}},routes:['openai'],models:[{ref,capabilities:['generate'],destination:'OpenAI',pinned:true,prices:{input:.4,output:1.6}}],budget:{total:.01,day:.01,month:.01}}},type:{type:'probe',normalize:v=>v}});await probeAi.connect('openai');probeAi.consent('OpenAI');},{hostOrigin,ref});
  const frame=page.frameLocator('iframe[title="AI connection"]');
  const pending=context.waitForEvent('page');await frame.getByRole('button',{name:'Connect on AI host',exact:true}).click();const popup=await pending;
  await popup.getByLabel('Provider',{exact:true}).selectOption('openai');await popup.getByLabel('API key',{exact:true}).fill(key);await popup.getByLabel('App spending cap (USD)',{exact:true}).fill('.01');assert.equal(await popup.getByLabel('Remember key on this AI host',{exact:true}).isChecked(),false);await popup.getByRole('button',{name:'Allow this app and connect',exact:true}).click();
  await frame.getByRole('status').filter({hasText:'Connected for this app'}).waitFor();
  const result=await page.evaluate(async ref=>{const result=await probeAi.generate({model:ref,messages:[{role:'user',content:'Synthetic transport check'}],maxTokens:8});return{text:result.text,storage:JSON.stringify({...localStorage,...sessionStorage}),url:location.href};},ref);
  assert.equal(result.text,'Live host transport passed');assert.equal(providerCalls,1);assert.equal(JSON.stringify(result).includes(key),false);
  const realFrame=page.frames().find(f=>f.url().startsWith(hostOrigin));
  const storage=await realFrame.evaluate(async()=>({localStorage:localStorage.getItem('fragment-kit-ai-probe:storage')==='probe',cache:Boolean(await(await caches.open('fragment-kit-ai-probe')).match('/fragment-kit-ai-probe')),indexedDB:await new Promise(resolve=>{const q=indexedDB.open('fragment-kit-ai-probe',1);q.onupgradeneeded=()=>q.result.createObjectStore('probe');q.onerror=()=>resolve(false);q.onsuccess=()=>{const db=q.result,tx=db.transaction('probe');const r=tx.objectStore('probe').get('probe');r.onsuccess=()=>resolve(r.result==='probe');r.onerror=()=>resolve(false);tx.oncomplete=()=>db.close();};}),remembered:JSON.stringify({...localStorage,...sessionStorage}).includes('synthetic-host-acceptance-key')}));
  assert.equal(storage.remembered,false);await frame.getByRole('button',{name:'Forget this app on the AI host',exact:true}).click();await frame.getByRole('status').filter({hasText:'credentials and consent removed'}).waitFor();assert.deepEqual(errors,[]);
  await page.screenshot({path:`test-results/ai-host-${engine}.png`,fullPage:true});
  records.push({engine,transport:'actual deployed host and popup',provider:'mocked; no paid call',providerCalls,appCredentialStored:false,hostCredentialRemembered:false,forgotten:true,topLevelToSameSiteFrameStorage:storage});
  await context.close();
 }finally{await browser.close();}
}
await fs.writeFile(`test-results/ai-host-${selectedEngine}.json`,JSON.stringify({date:new Date().toISOString(),host:hostURL,appOrigin,records},null,2)+'\n');console.log(JSON.stringify(records));
