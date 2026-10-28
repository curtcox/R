/* Verify runtime bytes on the first visit too, before a service worker controls the page. */
(() => {
const base=new URL('../',document.currentScript.src),hashes=new Map(Object.entries(OfflineAssets.hashes).map(([url,hash])=>[new URL(url,base).href,hash]));
const RAssets={async fetch(input,options){
 const url=new URL(typeof input==='string'?input:input.url,base);url.search='';
 const response=await fetch(input,options),expected=hashes.get(url.href);
 if(expected&&response.ok){
  const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(actual!==expected)throw Error('Pinned R asset failed integrity verification: '+url.pathname);
 }
 return response;
}};
globalThis.RAssets=RAssets;
})();
