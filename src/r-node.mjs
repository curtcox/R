/** Node-only adapter: public webR API, same RCore and R sources as the browser. */
import {WebR,ChannelType} from 'webr';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {RCore}=require('./r-core.js');
export async function createNodeCore(emit=()=>{}) {
  const webR=new WebR({channelType:ChannelType.PostMessage,interactive:false,RArgs:['--quiet','--no-save','--no-restore']});
  await webR.init();
  const engine={
    evaluate:(code,outputType='void')=>webR.evalRRaw(code,outputType,{captureStreams:false,captureConditions:false,captureGraphics:false}),
    writeFile:(name,bytes)=>webR.FS.writeFile(name,bytes),
    readFile:name=>webR.FS.readFile(name),
    async installPackages(names) {
      const directory=new URL('../.webr-cache/',import.meta.url);
      try {
        const index=await fs.readFile(new URL('./gallery-packages.dcf',import.meta.url));
        await webR.FS.writeFile('/tmp/online-PACKAGES',index);
        await engine.evaluate(`local({ info<-read.dcf('/tmp/online-PACKAGES'); info<-cbind(info,Repository=${JSON.stringify(directory.href.replace(/\/$/,''))}); rownames(info)<-info[,'Package']; webr::install(c(${names.map(JSON.stringify).join(',')}),info=info) })`);
      } catch(error) {throw Error('Package installation failed: '+error.message);}
    }
  };
  const core=new RCore(engine,emit);
  const pump=(async()=>{
    for await(const item of webR.stream()) {
      if(item.type==='online-output')core.output(item.data);
      else if(item.type==='stdout'||item.type==='stderr')core.output({type:'text',stream:item.type,text:item.data+'\n'});
    }
  })();
  const runtime=await fs.readFile(new URL('./r/runtime.R',import.meta.url),'utf8');
  const t256=await fs.readFile(new URL('./r/t256.R',import.meta.url),'utf8').catch(()=>null);
  const sha=await fs.readFile(new URL('../vendor/sha512.min.js',import.meta.url),'utf8');
  const bridge=await fs.readFile(new URL('./t256-bridge.js',import.meta.url),'utf8');
  await engine.evaluate('webr::eval_js('+JSON.stringify('(function(module,exports){'+sha+'})();\n'+bridge)+')');
  await core.install({runtime,t256});
  return {core,webR,engine,async close(){webR.close();await pump;}};
}
