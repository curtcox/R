/* Read-only production smoke test: never publishes to HashBin. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});let page;
 try{
  const context=await browser.newContext();page=await context.newPage({viewport:{width:1440,height:960}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});
  await page.goto('https://curtcox.github.io/R/');await page.waitForFunction(()=>!!globalThis.ROnline,null,{timeout:180000});
  await page.waitForFunction(()=>['done','error'].includes(document.body.dataset.state),null,{timeout:180000});
  assert.equal(await page.locator('body').getAttribute('data-state'),'done',await page.locator('#status').innerText());await page.locator('#output .figure-canvas').waitFor();
  fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/live-desktop.png',fullPage:true});
  await page.evaluate(()=>{document.getElementById('autorun').checked=false;ROnline.editor.setValue('cat("live origin",webr::eval_js("self.origin"),"\\n")\ncat(readline("Name: "))',-1);document.getElementById('stdin').value='Ada\n';ROnline.run();});
  await page.waitForFunction(()=>['done','error'].includes(document.body.dataset.state),null,{timeout:120000});assert.match(await page.locator('#output').innerText(),/live origin null[\s\S]*Name: Ada[\s\S]*Ada/);
  await page.waitForFunction(()=>document.getElementById('offline-status').textContent==='Available offline',null,{timeout:240000});
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!globalThis.ROnline,null,{timeout:120000});
  await page.evaluate(()=>{ROnline.editor.setValue('cat("live offline success\\n");plot(1:3)',-1);ROnline.run();});
  await page.waitForFunction(()=>['done','error'].includes(document.body.dataset.state),null,{timeout:120000});assert.equal(await page.locator('body').getAttribute('data-state'),'done');assert.match(await page.locator('#output').innerText(),/live offline success/);
  await page.locator('#output .figure-canvas').waitFor();await context.setOffline(false);
  await page.setViewportSize({width:375,height:812});await page.getByRole('tab',{name:'Output',exact:true}).click();await page.screenshot({path:'test-results/live-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Live GitHub Pages: default plot, opaque origin, input and verified offline reload passed');
 }catch(error){if(page)console.error('Live status:',await page.locator('#status').innerText().catch(()=>''));throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
