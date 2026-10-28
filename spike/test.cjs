const {chromium,firefox,webkit}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/spike/index.html':name));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}
 let body=fs.readFileSync(file);
 if (path.basename(file)==='offline-manifest.json' && process.env.DIAGNOSTIC_EVAL) {
  const spec=JSON.parse(body),html=fs.readFileSync(path.join(root,'spike/index.html'),'utf8').replace("blob: 'wasm-unsafe-eval'","blob: 'wasm-unsafe-eval' 'unsafe-eval'");
  spec.hashes['index.html']=require('node:crypto').createHash('sha256').update(html).digest('hex');body=Buffer.from(JSON.stringify(spec));
 }
 if (path.extname(file)==='.html' && process.env.DIAGNOSTIC_EVAL) body=Buffer.from(body.toString().replace("blob: 'wasm-unsafe-eval'","blob: 'wasm-unsafe-eval' 'unsafe-eval'"));
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(body);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {
 for(const name of (process.env.BROWSER?[process.env.BROWSER]:['chromium','firefox','webkit'])){
  const browser=await({chromium,firefox,webkit}[name]).launch({headless:true});
  try{
   const context=await browser.newContext(),page=await context.newPage();
   page.on('requestfailed',r=>console.log(name,'request failed',r.url(),r.failure()?.errorText));
   page.on('console',m=>{if(m.type()==='error')console.log(name,m.type(),m.text());});page.on('pageerror',e=>console.log(name,'ERROR',e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/spike/index.html${process.env.DIAGNOSTIC_EVAL?'?diagnostic-eval=1&offline-test=1':''}`);
   await page.waitForFunction(()=>globalThis.events?.some(e=>['fatal','complete'].includes(e.type)),null,{timeout:30000});
   const events=await page.evaluate(()=>events);fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/spike-${process.env.DIAGNOSTIC_EVAL?'diagnostic':'strict'}-${name}.json`,JSON.stringify(events,null,2));
   console.log(name,JSON.stringify(events.filter(e=>e.type==='fatal'||e.type==='origin'||e.type==='complete')));
   if (!process.env.DIAGNOSTIC_EVAL) {
    assert.ok(events.some(e=>e.type==='fatal'),name+' should expose the CSP startup failure');
    assert.match(JSON.stringify(events),/unsafe-eval|EvalError|Content Security Policy|call to eval|call to Function/i);
    continue;
   }
   assert.ok(events.some(e=>e.type==='complete'),name+' spike failed');
   assert.equal(events.find(e=>e.type==='origin')?.origin,'null');
   assert.equal(events.find(e=>e.type==='hardened')?.ok,true);
   assert.ok(events.some(e=>e.type==='engine'&&e.message.type==='stdout'&&e.message.data==='[1] 1'));
   const image=events.find(e=>e.type==='complete');
   assert.ok(image?.pngBytes > 100);
   assert.deepEqual(image.pngSignature,[137,80,78,71,13,10,26,10]);
   assert.equal(image.width,1344); assert.equal(image.height,960);
   assert.match(events.find(e=>e.type==='plot')?.svg,/<svg/);
   const direct = events.filter(e=>e.type==='network');assert.deepEqual(direct,[],'Every runtime read must use the proxy/preloaded bytes');
   await context.setOffline(true); await page.reload();
   await page.waitForFunction(()=>globalThis.events?.some(e=>['fatal','complete'].includes(e.type)),null,{timeout:30000});
   const offline=await page.evaluate(()=>events);
   assert.ok(offline.some(e=>e.type==='complete'),name+' offline run failed: '+JSON.stringify(offline));
   console.log(name+': opaque origin, print, SVG, PNG and verified offline reload passed (diagnostic CSP only)');
  }finally{await browser.close();}
 }
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
