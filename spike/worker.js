const boot = (() => {
// S1 adapter: webR's main and worker sides share a single opaque worker.
const send = self.postMessage.bind(self);
addEventListener('error', event => { send({type:'fatal',error:String(event.message || event.error || 'Unhandled worker exception')}); event.preventDefault(); });
const nativeImport = self.importScripts.bind(self);
const NativeXHR = self.XMLHttpRequest;
const bytes = new Map();
const pending = new Map();
const requests = [];
let nextID = 0, readID, resolveReady;
const ready = new Promise(resolve => resolveReady = resolve);
function feed() {
  if (!readID || !requests.length) return;
  const uuid = readID; readID = null;
  self.onmessage({data:{type:'response',data:{uuid,resp:requests.shift()}}});
}
self.postMessage = message => {
  if (message.type.startsWith('hashbin:')) { send(message); return; }
  if (message.type === 'resolve') { resolveReady(); return; }
  if (message.type === 'request' && message.data.msg.type === 'read') { readID = message.data.uuid; feed(); return; }
  if (message.type === 'response') {
    const p = pending.get(message.data.uuid); pending.delete(message.data.uuid);
    const payload = message.data.resp.data;
    if (payload.payloadType === 'err') p.reject(Error(payload.obj.message)); else p.resolve(payload.obj);
    return;
  }
  send({type:'engine',message});
  if (message.type === 'stderr' && /EvalError:|unsafe-eval|Refused to evaluate|call to eval|call to Function/.test(message.data)) send({type:'fatal',error:message.data});
};
function request(type, data) {
  const uuid = String(++nextID);
  return new Promise((resolve,reject) => {
    pending.set(uuid,{resolve,reject}); requests.push({type:'request',data:{uuid,msg:{type,data}}}); feed();
  });
}
async function evaluate(code, outputType='void') {
  return request('evalRRaw',{code,outputType,options:{captureStreams:false,captureConditions:false,captureGraphics:false}});
}
return async function boot() {
  try {
    // Synchronous VFS reads cannot await the SDK proxy. Preload only files identified in the cold-start trace.
    await Promise.all(['R.js',...runtimeFiles].map(async name => {
      const response = await fetch(baseUrl+name); if (!response.ok) throw Error('Download failed: '+name);
      bytes.set(baseUrl+name,await response.arrayBuffer());
    }));
    const scriptURL = URL.createObjectURL(new Blob([bytes.get(baseUrl+'R.js')],{type:'text/javascript'}));
    self.importScripts = (...urls) => nativeImport(...urls.map(url => url === baseUrl+'R.js' ? scriptURL : url));
    self.XMLHttpRequest = class extends NativeXHR {
      open(method,url,async=true,...rest) {
        this.localURL = new URL(url,baseUrl).href;
        if (bytes.has(this.localURL)) {this.localMethod=method; this.local=true;} else {
          send({type:'network',method,url:this.localURL}); super.open(method,url,async,...rest);
        }
      }
      setRequestHeader(...args) {if(!this.local)super.setRequestHeader(...args);}
      getResponseHeader(name) {if(!this.local)return super.getResponseHeader(name);return name.toLowerCase()==='content-length'?String(bytes.get(this.localURL).byteLength):null;}
      get status() {return this.local?200:super.status;}
      get response() {return this.local ? (this.responseType==='arraybuffer'?bytes.get(this.localURL):new TextDecoder().decode(bytes.get(this.localURL))) : super.response;}
      get responseText() {return this.local?new TextDecoder().decode(bytes.get(this.localURL)):super.responseText;}
      send(...args) {if(!this.local)return super.send(...args);this.onload?.();}
    };
    self.onmessage({data:{type:'init',data:{channelType:3,config:{baseUrl,repoUrl:'https://repo.r-wasm.org',homedir:'/home/web_user',RArgs:['--quiet','--no-save','--no-restore'],REnv:{R_HOME:'/usr/lib/R',FONTCONFIG_PATH:'/etc/fonts',R_ENABLE_JIT:'0'},interactive:false,createLazyFilesystem:true}}}});
    await ready;
    // Keep loader capabilities inside this closure; R's indirect eval must not recover them.
    Module.webr.channel.WorkerProxy = undefined;
    for (const key of ['caches', 'indexedDB', 'importScripts', 'Worker', 'SharedWorker']) {
      for (let prototype = Object.getPrototypeOf(self); prototype; prototype = Object.getPrototypeOf(prototype)) {
        if (Object.getOwnPropertyDescriptor(prototype, key)?.configurable) delete prototype[key];
      }
      Object.defineProperty(self, key, {value: undefined, configurable: false, writable: false});
    }
    const hardened = await evaluate('webr::eval_js("[self.caches,self.indexedDB,self.importScripts,self.Worker,self.SharedWorker,Module.webr.channel.WorkerProxy].every(x => x === undefined)")', 'boolean');
    send({type:'hardened', ok:hardened});
    await evaluate('print(1)');
    const origin = await evaluate('webr::eval_js("self.origin")','string');
    send({type:'origin',origin});
    await evaluate('svg("/home/web_user/plot.svg"); plot(1:3); dev.off()');
    const svg = new TextDecoder().decode(await request('readFile',{path:'/home/web_user/plot.svg'}));
    send({type:'plot',svg});
    await evaluate('png("/home/web_user/plot.png",width=1344,height=960); plot(1:3); dev.off()');
    const png = await request('readFile',{path:'/home/web_user/plot.png'});
    send({type:'complete',pngBytes:png.byteLength,pngSignature:Array.from(png.slice(0,8)),width:new DataView(png.buffer,png.byteOffset).getUint32(16),height:new DataView(png.buffer,png.byteOffset).getUint32(20)});
  } catch (error) {send({type:'fatal',error:String(error),stack:error.stack});}
};
})();
