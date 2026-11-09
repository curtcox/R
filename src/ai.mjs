import { createAi, createAskPanel, createAiSettings, createCompareModels } from '../vendor/fragment-kit-v0.4.3/src/ai/index.js';
import { createDialog, createStorage, element, readResponse, text } from '../vendor/fragment-kit-v0.4.3/src/index.js';
/** Every probe is a fresh opaque sandbox, never the editor or persistent home. */
export function createRAiCheck(sdk) {
  return ({ document, expected, signal }) => new Promise((resolve, reject) => {
    let text = '', outputBytes=0, settled = false, probe;
    const timer = setTimeout(() => finish(new Error('R AI check timed out.')), 30000);
    const stop = () => finish(signal.reason ?? new Error('Cancelled.'));
    function finish(error, result) { if(settled)return; settled=true; clearTimeout(timer); signal?.removeEventListener('abort',stop); probe?.dispose(); error?reject(error):resolve(result); }
    if(signal?.aborted){finish(signal.reason);return;} signal?.addEventListener('abort',stop,{once:true});
    probe = new RClient({ lowMemory:true, createWorker:RSandbox.factory(sdk), onMessage:item=>{
      if(item.type==='text' && item.stream==='stdout'){ if((outputBytes+=new TextEncoder().encode(String(item.text)).length)>65536){finish(new Error('R AI output exceeds 64 KiB.'));return;} text+=item.text; }
      else if(item.type==='done') finish(null, item.ok && (expected===undefined || text===expected));
      else if(item.type==='fatal'||item.type==='stopped') finish(new Error('R AI sandbox check failed.'));
    }});
    probe.run(document.src,document.r.stdin,'auto');
  });
}
export async function mountRAi({config,type,urlState,sdk,getSnapshot,getFingerprint,onApply,container,status}) {
  type.ai={describe:'R Online document: src is R source; r.stdin is program input; r.autorun is a boolean and must be preserved. Preserve unrelated code. R executes only in the app sandbox after an explicit Run.',paths:['/src','/r/stdin'],checks:{runsAndOutputs:createRAiCheck(sdk)}};
  const storage=createStorage({prefix:config.storagePrefix}), ai=await createAi({config,type,storage});
  if(!ai)return null;
  const dialog=createDialog('Ask for an R change',{id:'r-ai'});
  const ask=createAskPanel({ai,type,urlState,getSnapshot,getFingerprint,onApply,container:dialog.body});
  dialog.dialog.addEventListener('close',()=>ask.cancel());
  const button=element('button','Ask',{type:'button',id:'ask-open'});button.onclick=()=>{dialog.open();ask.open();};
  document.querySelector('.toolbar').prepend(button);
  createAiSettings({ai,container,onChange:ask.refreshModels});
  let comparison;
  const compare=element('button','Compare models',{type:'button'});compare.onclick=async()=>{
    try{if(!comparison){const response=await fetch('ai-suite.json');if(!response.ok)throw new Error('AI suite is unavailable.');comparison=createCompareModels({ai,type,suite:JSON.parse(text(await readResponse(response,256*1024))),storage,getSnapshot,getFingerprint,onApply,urlState});}await comparison.refresh();comparison.open();}
    catch(error){status(error.message);}
  };container.append(compare);
  return {cancel(){ask.cancel();comparison?.close();},ai,type};
}
