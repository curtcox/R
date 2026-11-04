/* Browser-only fixture publish flow; no real HashBin writes or account balance. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function hashbin(browser,base){
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.addCookies([{url:base,name:'ronline-test-client',value:'1'}]);
 await context.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{value:2}));
 await context.route('**/vendor/hashbin-sdk-v0.4.0.mjs',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.resolve(__dirname,'fixtures/hashbin-sdk.mjs'),'utf8')}));
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const ready=()=>page.waitForFunction(()=>!!globalThis.ROnline,null,{timeout:120000});
 try{
  await page.goto(base+'/?hashbin-test=1&run=0');await ready();
  await page.evaluate(()=>{ROnline.editor.setValue('cat("popup save\\n")',-1);document.getElementById('stdin').value='saved input\n';document.getElementById('autorun').checked=false;});
  const open=async()=>{if(!await page.locator('#hashbin-save').isVisible())await page.locator('#more-toggle').click();await page.locator('#hashbin-save').click();await page.waitForFunction(()=>!document.getElementById('hashbin-confirm').disabled);};
  await open();await page.locator('#hashbin-confirm').click();await page.waitForFunction(()=>document.getElementById('hashbin-status').textContent==='Saved to HashBin.');assert.ok(new URL(page.url()).hash.length>8);await page.locator('#hashbin-dialog .fk-close').click();
  await page.evaluate(()=>{localStorage.setItem('ronline:test:publish','cancel');ROnline.editor.setValue('cat("keep cancelled work\\n")',-1);});
  await open();await page.locator('#hashbin-confirm').click();await page.waitForFunction(()=>/cancelled on HashBin/.test(document.getElementById('hashbin-message').textContent));await page.locator('#hashbin-dialog .fk-close').click();
  await page.evaluate(()=>{localStorage.setItem('ronline:test:publish','redirect');ROnline.editor.setValue('cat("redirect restored\\n")',-1);});
  const before=await page.evaluate(()=>ROnline.snapshot());
  await open();await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#hashbin-confirm').click()]);await page.waitForFunction(()=>!!globalThis.ROnline&&document.getElementById('hashbin-status').textContent==='Saved to HashBin.',null,{timeout:120000});
  assert.deepEqual(await page.evaluate(()=>ROnline.snapshot()),before);
  assert.ok(new URL(page.url()).hash.length>8);
 }finally{await context.close();}
};
