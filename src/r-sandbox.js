/* Every program runs in SDK v0.3.0's opaque-origin sandbox; never a page-origin worker. */
(() => {
const sharedT256 = new Map();
const RSandbox = {
  source(fetchText=url=>RAssets.fetch(url).then(r=>{if(!r.ok)throw Error('R runtime download failed. Check your connection and retry.');return r.text();})) {
    this.text ||= Promise.all([
      ...['src/r-core.js','src/r-worker.js'].map(fetchText),fetchText(WEBR_URL+'webr-worker.js'),
      ...['runtime','t256'].map(name=>fetchText('src/r/'+name+'.R')),fetchText('src/runtime-files.json'),fetchText('vendor/sha512.min.js'),fetchText('src/t256-bridge.js'),fetchText('src/gallery-packages.dcf')
    ]).then(([core,adapter,worker,runtime,t256,files,sha,bridge,packageIndex])=>`${core}\n;\n${adapter}\n;\n(function(module,exports){${sha}})();\n;${bridge}\n;${worker}\n;\nRWorker.boot(${JSON.stringify({runtime,t256,packageIndex})},${files});`);
    this.text.catch(()=>this.text=null);return this.text;
  },
  factory(sdk,{base=new URL('src/',location.href).href}={}) {
    return ()=>{
      const sandbox=sdk.createSandbox({source:this.source(),base,proxy:[WEBR_URL,PACKAGE_URL],fetch:RAssets.fetch});
      const handle={frame:sandbox.frame,onmessage:null,onerror:null,terminate:()=>sandbox.terminate(),postMessage:data=>sandbox.postMessage({...data,t256:Object.fromEntries(sharedT256)})};
      let verified=Promise.resolve();
      sandbox.onmessage=event=>{
        const item=event.data;
        if(item?.type==='t256-cache'){
          if(typeof item.cid==='string'&&typeof item.text==='string'&&HashBinDocuments.bytes(item.text).length<=HashBinDocuments.MAX_BYTES){
            verified=verified.then(async()=>{try{await HashBinDocuments.verify(item.cid,HashBinDocuments.bytes(item.text));sharedT256.set(item.cid,item.text);}catch{/* Never seed content with an invalid CID. */}});
          }
        }else verified.then(()=>handle.onmessage?.(event));
      };
      sandbox.onerror=event=>handle.onerror?.(event);
      return handle;
    };
  }
};
if(typeof module!=='undefined')module.exports=RSandbox;else globalThis.RSandbox=RSandbox;
})();
