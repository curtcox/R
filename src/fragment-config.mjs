import * as kit from '../vendor/fragment-kit-v0.3.1/src/index.js';
import appConfig from '../fragment-kit.config.json' with { type: 'json' };
export const config = kit.createConfig(appConfig);
export const type = { type:'r',settingsKeys:[],fileName:'program.json',contentType:'application/json',
  normalize(value) {
    if(typeof value?.src!=='string'||(value.r?.stdin!=null&&typeof value.r.stdin!=='string'))throw Error('Source and program input must be text.');
    return {src:value.src,r:{stdin:value.r?.stdin??'',autorun:value.r?.autorun!==false}};
  },isDefault:doc=>!doc.r.stdin&&doc.r.autorun
};
export const legacyWriter=(doc,{url,run,view,compress,documents})=>{
  url.searchParams.set(type.isDefault(doc)?'compressed':'doc',compress(type.isDefault(doc)?doc.src:documents.serialize(doc)));
  if(run===false)url.searchParams.set('run','0');if(view)url.searchParams.set('view',view);return url.href;
};
export const urlState=kit.createUrlState({config,type,legacyWriter});
export const HashBinDocuments={...urlState.documents,MAX_BYTES:config.maxBytes,link:urlState.link,
  ...Object.fromEntries(['bytes','encode64','decode64','isCID','cidLength','verify'].map(key=>[key,kit[key]])),cid:value=>kit.cid(value,config.allowedHosts)};
export class HashBinStore extends kit.HashBinStore {constructor(options={}){super({config,type,...options});}}
export const ShareLinks={build:({url,run,view,...doc})=>urlState.build(doc,{url,run,view}),parse:href=>{const intent=urlState.parse(href);return intent.kind==='none'?null:{...intent,...intent.doc};}};
export const LZString={compressToEncodedURIComponent:kit.compress,decompressFromEncodedURIComponent:kit.decompress};
export {ShareClient} from '../vendor/fragment-kit-v0.3.1/src/index.js';
// Execution keeps its independently pinned v0.3.0 sandbox. Publish uses the kit's v0.4.0 SDK.
export const loadExecutionSDK=()=>import('../vendor/hashbin-sdk-v0.3.0.mjs');
