/* S1: adapter and unmodified webR worker share one opaque-origin classic worker. */
const RWorker = (() => {
  const send=self.postMessage.bind(self), nativeImport=self.importScripts.bind(self), NativeXHR=self.XMLHttpRequest;
  const bytes=new Map(),pending=new Map(),queue=[];
  let core,readID,next=0,resolveReady,engineMessage;
  const ready=new Promise(resolve=>resolveReady=resolve);
  const feed=()=>{if(readID&&queue.length){const uuid=readID;readID=null;engineMessage({data:{type:'response',data:{uuid,resp:queue.shift()}}});}};
  function request(type,data){const uuid=String(++next);return new Promise((resolve,reject)=>{pending.set(uuid,{resolve,reject});queue.push({type:'request',data:{uuid,msg:{type,data}}});feed();});}
  async function preload(urls,status){
    let count=0;
    // Bound concurrent downloads so low-memory browsers do not hold every response at once.
    const work=urls.filter(url=>!bytes.has(url));
    await Promise.all(Array.from({length:Math.min(6,work.length)},async()=>{
      for(;;){const url=work.shift();if(!url)return;const response=await fetch(url);if(!response.ok)throw Error('Download failed: '+url);
        bytes.set(url,await response.arrayBuffer());if(status)status('Loading R files… '+(++count)+' downloaded');}
    }));
  }
  self.postMessage=message=>{
    if(message.type?.startsWith('hashbin:')){send(message);return;}
    if(message.type==='resolve'){resolveReady();return;}
    if(message.type==='request'&&message.data.msg.type==='read'){readID=message.data.uuid;feed();return;}
    if(message.type==='response'){
      const p=pending.get(message.data.uuid);if(!p)return;pending.delete(message.data.uuid);const payload=message.data.resp.data;
      if(payload.payloadType==='err')p.reject(Error(payload.obj.message));else p.resolve(payload.obj);return;
    }
    if(message.type==='online-output'){if(message.data.type==='t256-cache')send(message.data);else core?.output(message.data);}
    else if(['stdout','stderr'].includes(message.type))core?.output({type:'text',stream:message.type,text:message.data+'\n'});
    else if(message.type==='system'&&message.data.type==='console.warn'&&core?.buffer)core.output({type:'text',stream:'stderr',text:message.data.data+'\n'});
    else if(message.type==='system'&&message.data.type==='setTimeoutWasm'){
      const {ptr,args,delay}=message.data.data;setTimeout(()=>request('invokeWasmFunction',{ptr,args}),delay);
    }
  };
  function parseIndex(text){
    const records=new Map();
    for(const block of text.replace(/\n[ \t]+/g,' ').split(/\n\s*\n/)){
      const item=Object.fromEntries(block.split('\n').map(line=>{const i=line.indexOf(':');return [line.slice(0,i),line.slice(i+1).trim()];}));
      if(item.Package)records.set(item.Package,item);
    }
    return records;
  }
  let index,indexText,fallbackIndex;
  async function packages(names,status=()=>{}){
    if(!index){
      try{const response=await fetch(PACKAGE_URL+'PACKAGES');if(!response.ok)throw Error('Package index is unavailable');indexText=await response.text();}
      catch{indexText=fallbackIndex;}
      if(!indexText)throw Error('Package index is unavailable. Reconnect and retry.');index=parseIndex(indexText);
    }
    const selected=new Set();
    const add=name=>{if(selected.has(name)||!index.has(name))return;selected.add(name);const p=index.get(name);
      for(const dep of ((p.Depends||'')+','+(p.Imports||'')).split(',')){const key=dep.trim().split(/[ (]/)[0];if(key&&key!=='R')add(key);}};
    names.forEach(add);
    status('Installing '+names.join(', ')+' and '+Math.max(0,selected.size-names.length)+' dependencies…');
    await preload([...selected].map(name=>{const p=index.get(name);return PACKAGE_URL+(p.File||`${name}_${p.Version}.tgz`); }));
    await request('writeFile',{path:'/tmp/online-PACKAGES',data:new TextEncoder().encode(indexText)});
  }
  return {async boot(modules,files){
    try{
      engineMessage=self.onmessage;fallbackIndex=modules.packageIndex;
      send({type:'status',text:'Loading R… (~23 MB on first visit)'});
      await preload(['R.js',...files.startup].map(name=>WEBR_URL+name));
      const script=URL.createObjectURL(new Blob([bytes.get(WEBR_URL+'R.js')],{type:'text/javascript'}));
      self.importScripts=(...urls)=>nativeImport(...urls.map(url=>url===WEBR_URL+'R.js'?script:url));
      self.XMLHttpRequest=class extends NativeXHR{
        open(method,url,async=true,...rest){this.localURL=new URL(url,WEBR_URL).href;this.local=bytes.has(this.localURL);if(!this.local)super.open(method,url,async,...rest);}
        setRequestHeader(...args){if(!this.local)super.setRequestHeader(...args);}
        getResponseHeader(name){return this.local?(name.toLowerCase()==='content-length'?String(bytes.get(this.localURL).byteLength):null):super.getResponseHeader(name);}
        get status(){return this.local?200:super.status;}
        get response(){return this.local?(this.responseType==='arraybuffer'?bytes.get(this.localURL):new TextDecoder().decode(bytes.get(this.localURL))):super.response;}
        get responseText(){return this.local?new TextDecoder().decode(bytes.get(this.localURL)):super.responseText;}
        send(...args){if(!this.local)return super.send(...args);this.onload?.();}
      };
      engineMessage({data:{type:'init',data:{channelType:3,config:{baseUrl:WEBR_URL,repoUrl:'https://repo.r-wasm.org',homedir:'/home/web_user',RArgs:['--quiet','--no-save','--no-restore'],REnv:{R_HOME:'/usr/lib/R',FONTCONFIG_PATH:'/etc/fonts',R_ENABLE_JIT:'0'},interactive:false,createLazyFilesystem:true}}}});
      await ready;
      Module.webr.channel.WorkerProxy=undefined;harden(self);
      const engine={
        evaluate:(code,outputType='void')=>request('evalRRaw',{code,outputType,options:{captureStreams:false,captureConditions:false,captureGraphics:false}}),
        writeFile:(path,data)=>request('writeFile',{path,data}),
        readFile:path=>request('readFile',{path}),
        async prepare(source,status){
          // A synchronous VFS read cannot await the page proxy. Preload the remainder before user R executes.
          await preload(files.lazy.map(name=>WEBR_URL+name),status);
          const names=[];
          for(const name of scanPackages(source))if(!await engine.evaluate(`requireNamespace(${JSON.stringify(name)},quietly=TRUE)`,'boolean'))names.push(name);
          for(const match of source.matchAll(/(?:install\.packages|webr::install)\s*\(\s*["']([A-Za-z][\w.]*)["']/g))names.push(match[1]);
          if(names.length)await packages(names,status);
        },
        async installPackages(names){
          await packages(names);
          const q=JSON.stringify;
          await engine.evaluate(`local({ info <- read.dcf('/tmp/online-PACKAGES'); info <- cbind(info,Repository=${q(PACKAGE_URL.replace(/\/$/,''))}); rownames(info)<-info[,'Package']; webr::install(c(${names.map(q).join(',')}),info=info) })`);
        }
      };
      core=new RCore(engine,send);await core.install(modules);
      URL.revokeObjectURL(script);
      addEventListener('message',event=>{if(typeof event.data?.source!=='string')return;event.stopImmediatePropagation();T256Bridge.seed(event.data.t256);core.run(event.data).catch(error=>send({type:'fatal',error:String(error),id:event.data.id}));});
      send({type:'ready'});
    }catch(error){send({type:'fatal',error:String(error)});}
  }};
})();
