const {chromium,firefox,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createServer}=require('./server.cjs');
const name=process.env.BROWSER||'chromium';
(async()=>{
 const site=createServer(),base=await site.start();let browser,page;
 try{
  browser=await({chromium,firefox,webkit}[name]).launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true});page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[],violations=[];page.on('pageerror',e=>{console.error('Page error at '+page.url()+': '+String(e));errors.push(String(e));});page.on('console',m=>{if(process.env.DEBUG)console.log(m.type(),m.text());});
  await context.exposeBinding('__cspViolation',(_,value)=>violations.push(value));
  await context.addInitScript(()=>addEventListener('securitypolicyviolation',e=>globalThis.__cspViolation(e.violatedDirective+' '+e.blockedURI)));
  const ready=()=>page.waitForFunction(()=>!!globalThis.ROnline,null,{timeout:120000});
  const finished=()=>page.waitForFunction(()=>['done','error','idle'].includes(document.body.dataset.state),null,{timeout:120000});
  async function run(source,stdin=''){await page.evaluate(({source,stdin})=>{document.getElementById('autorun').checked=false;ROnline.editor.setValue(source,-1);document.getElementById('stdin').value=stdin;ROnline.run();},{source,stdin});await finished();}
  console.log(name+': default program');await page.goto(base);await ready();await finished();
  assert.equal(await page.locator('body').getAttribute('data-state'),'done',await page.locator('#status').innerText());
  await page.locator('#output .figure-canvas').waitFor();
  await page.evaluate(()=>ROnline.editor.setValue('cat("automatic edit\\n")',-1));await page.waitForFunction(()=>document.getElementById('output').textContent.includes('automatic edit'));
  console.log(name+': input, errors, sandbox');
  await run('name <- readline("Name: "); cat("Hello",name,"\\n")','Ada\n');assert.match(await page.locator('#output').innerText(),/Name: Ada[\s\S]*Hello Ada/);
  await run('cat("before\\n")\nstop("broken")');assert.equal(await page.evaluate(()=>ROnline.editor.session.getAnnotations()[0].row),1);
  await run('cat("origin",webr::eval_js("self.origin"),"\\n"); cat(webr::eval_js("[self.caches,self.indexedDB,self.importScripts,self.Worker,self.SharedWorker,Module.webr.channel.WorkerProxy].every(x=>x===undefined)"))');
  assert.match(await page.locator('#output').innerText(),/origin null[\s\S]*TRUE/);
  assert.ok((await page.locator('iframe[title="Code sandbox"]').evaluateAll(frames=>frames.map(f=>f.getAttribute('sandbox')))).every(x=>x==='allow-scripts'));
  console.log(name+': 256t content verification across Stop');
  const fixture=fs.readdirSync('tests/fixtures/256t').find(file=>fs.readFileSync('tests/fixtures/256t/'+file,'utf8').startsWith('{'));
  const savedCall='t256$call("'+fixture+'",t256$cid("1"))';
  await run(savedCall);assert.match(await page.locator('#output').innerText(),/43/);
  await page.evaluate(()=>ROnline.client.stop());await run(savedCall);assert.match(await page.locator('#output').innerText(),/43/);assert.equal(site.count256t(fixture),1);
  console.log(name+': rich output and downloads');
  await run('display_html("<script>parent.hacked=true</script><b>safe</b>"); display_markdown("# heading")');
  assert.equal(await page.locator('#output iframe').count(),2);assert.equal(await page.locator('#output iframe').first().getAttribute('sandbox'),'');assert.equal(await page.evaluate(()=>globalThis.hacked),undefined);
  await run('plot(1:3)');await page.locator('#output .figure-canvas').waitFor();await page.locator('#download-open').click();const download=page.waitForEvent('download');await page.locator('#download-png').click();assert.equal((await download).suggestedFilename(),'image.png');await page.locator('[data-close="download-dialog"]').click();
  console.log(name+': sharing, QR and registration guidance');
  await run('cat(readline())','shared\n');await page.locator('#share-open').click();const link=await page.locator('#share-url').inputValue();assert.match(link,/doc=/);
  await page.locator('#no-run').check();assert.match(await page.locator('#share-url').inputValue(),/run=0/);await page.locator('[data-close="share-dialog"]').click();
  await page.locator('#qr-open').click();assert.equal(await page.locator('#qr-image svg').count(),1);await page.locator('[data-close="qr-dialog"]').click();
  await page.locator('#more-toggle').click();await page.locator('#hashbin-save').click();assert.match(await page.locator('#hashbin-message').innerText(),/registered client ID/);await page.locator('#hashbin-close').click();
  console.log(name+': Stop and auto-run timeout');
  await page.evaluate(()=>{ROnline.editor.setValue('repeat {}',-1);ROnline.run('auto');});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Stopped after 5 s'),null,{timeout:120000});
  await run('print("recovered")');assert.match(await page.locator('#output').innerText(),/recovered/);
  await page.evaluate(()=>{ROnline.editor.setValue('repeat {}',-1);ROnline.run();});await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Running'));await page.locator('#stop').click();assert.equal(await page.locator('#status').innerText(),'Stopped');
  console.log(name+': gallery and mobile');await page.goto(base+'/gallery.html');assert.ok(await page.locator('#gallery article').count()>=30);await page.locator('#search').fill('Mandelbrot');assert.equal(await page.locator('#gallery article').count(),1);
  await page.setViewportSize({width:375,height:812});await page.goto(base+'/?run=0');await ready();await page.getByRole('tab',{name:'Code',exact:true}).click();await page.locator('#editor').waitFor({state:'visible'});await page.getByRole('tab',{name:/^Input/}).click();await page.locator('#stdin').waitFor({state:'visible'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok((await page.locator('#run').boundingBox()).height>=40);
  console.log(name+': offline');await page.waitForFunction(()=>document.getElementById('offline-status').textContent==='Available offline',null,{timeout:180000});
  await context.setOffline(true);await page.reload();await ready();await run('cat("offline success\\n");plot(1:3)');assert.match(await page.locator('#output').innerText(),/offline success/);await page.locator('#output .figure-canvas').waitFor();await context.setOffline(false);
  console.log(name+': optional gallery packages offline');
  await page.locator('#more-toggle').click();await page.locator('#offline-packages').click();
  await page.waitForFunction(()=>document.getElementById('package-status').textContent.startsWith('Gallery packages available offline'),null,{timeout:180000});
  await context.setOffline(true);await run('library(jsonlite);cat(toJSON(c(1,2)),"\\n")');
  assert.equal(await page.locator('body').getAttribute('data-state'),'done',await page.locator('#output').innerText());assert.match(await page.locator('#output').innerText(),/\[1,2\]/);await context.setOffline(false);
  console.log(name+': HashBin fixture publish and redirect');await require('./hashbin.cjs')(browser,base);
  if(process.env.FULL_GALLERY){for(const sample of require('../../src/examples.js').catalog){console.log(name+': '+sample.id);page.once('dialog',d=>d.accept());await page.goto(base+'/?example='+sample.id+'&run=0');await ready();await page.evaluate(()=>ROnline.run());await finished();assert.equal(await page.locator('body').getAttribute('data-state'),'done',sample.id+': '+await page.locator('#output').innerText());}}
  fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/'+name+'-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);console.log(name+': browser suite passed');
 }catch(e){if(page){fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/'+name+'-failure.png',fullPage:true}).catch(()=>{});console.error('Status',await page.locator('#status').innerText().catch(()=>''));console.error('Output',await page.locator('#output').innerText().catch(()=>''));}throw e;}
 finally{await browser?.close();site.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
