/* Every program runs in SDK v0.3.0's opaque-origin sandbox; never a page-origin worker. */
(() => {
const RSandbox = {
  source(fetchText=url=>RAssets.fetch(url).then(r=>{if(!r.ok)throw Error('R runtime download failed. Check your connection and retry.');return r.text();})) {
    this.text ||= Promise.all([
      ...['src/r-core.js','src/r-worker.js'].map(fetchText),fetchText(WEBR_URL+'webr-worker.js'),
      ...['runtime','t256'].map(name=>fetchText('src/r/'+name+'.R')),fetchText('src/runtime-files.json'),fetchText('vendor/sha512.min.js'),fetchText('src/t256-bridge.js')
    ]).then(([core,adapter,worker,runtime,t256,files,sha,bridge])=>`${core}\n;\n${adapter}\n;\n(function(module,exports){${sha}})();\n;${bridge}\n;${worker}\n;\nRWorker.boot(${JSON.stringify({runtime,t256})},${files});`);
    this.text.catch(()=>this.text=null);return this.text;
  },
  factory(sdk,{base=new URL('src/',location.href).href}={}) {
    return ()=>sdk.createSandbox({source:this.source(),base,proxy:[WEBR_URL,PACKAGE_URL],fetch:RAssets.fetch});
  }
};
if(typeof module!=='undefined')module.exports=RSandbox;else globalThis.RSandbox=RSandbox;
})();
