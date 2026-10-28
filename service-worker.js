/* Atomic, content-versioned offline install. Sibling Pages projects share Cache Storage:
   every cached response is checked against pinned SHA-256 before it is served. */
importScripts('offline-assets.js','vendor/hashbin-cache-v0.3.0.js');
const CACHE=OfflineAssets.version,absolute=asset=>new URL(asset,self.registration.scope).href;
const verified=HashBinCache.verify,assetHash=HashBinCache.lookup(OfflineAssets.hashes,self.registration.scope);
async function populate(){
 const existed=await caches.has(CACHE),cache=await caches.open(CACHE);
 try{
  const work=OfflineAssets.assets.slice();
  await Promise.all(Array.from({length:6},async()=>{for(;;){const asset=work.shift();if(!asset)return;
   const url=absolute(asset),response=await fetch(url,{cache:'reload'});
   if(!response.ok)throw Error('Offline download failed: '+asset);
   const checked=await verified(response,assetHash(url),url);if(!checked)throw Error('Offline integrity mismatch: '+asset);
   await cache.put(url,checked);
  }}));
 }catch(error){if(!existed)await caches.delete(CACHE);throw error;}
}
const isEditor=url=>[new URL(self.registration.scope).pathname,new URL(self.registration.scope).pathname+'index.html'].includes(url.pathname);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 await populate();const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 if(!windows.some(client=>isEditor(new URL(client.url))))await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await self.clients.claim();for(const name of await caches.keys())if(name.startsWith('ronline-')&&!name.startsWith('ronline-spike-')&&name!==CACHE)await caches.delete(name);
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(url.href===absolute('offline-assets.js')){event.respondWith(new Response('const OfflineAssets='+JSON.stringify(OfflineAssets)+';globalThis.OfflineAssets=OfflineAssets;',{headers:{'Content-Type':'text/javascript'}}));return;}
 const local=url.origin===scope.origin&&url.pathname.startsWith(scope.pathname);
 const key=local?url.origin+url.pathname:url.href;
 const index=event.request.mode==='navigate'&&isEditor(url);
 const entry=index?absolute('index.html'):key;
 const expected=assetHash(entry)||OfflineAssets.packageHashes[key];
 if(!expected)return; // Arbitrary, unversioned packages and other URLs stay network-only.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=async()=>{const response=await verified(await cache.match(entry),expected,entry);if(!response)await cache.delete(entry);return response;};
  // Gallery/docs show fresh deployments online. The editor keeps one complete app version.
  let readonly=event.request.mode==='navigate'&&!isEditor(url);
  try{const ref=new URL(event.request.referrer);readonly ||= ref.origin===scope.origin&&ref.pathname.endsWith('.html')&&!isEditor(ref);}catch{}
  if(local&&readonly){try{return await fetch(event.request);}catch(error){const response=await cached();if(response)return response;throw error;}}
  const copy=await cached();if(copy)return copy;
  const response=await fetch(event.request);
  const checked=await verified(response.clone(),expected,key);
  if(checked){await cache.put(entry,checked.clone());return checked;}
  if(OfflineAssets.packageHashes[key])return response; // Upstream rebuilt a package: online still works.
  throw Error('Pinned asset did not match its SHA-256: '+key);
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='activate-update'){self.skipWaiting();return;}
 if(event.data?.type==='cache-packages'){event.waitUntil((async()=>{
  const port=event.ports[0],cache=await caches.open(CACHE);let count=0;const entries=Object.entries(OfflineAssets.packageHashes);
  try{for(const[url,hash]of entries){
   if(!await verified(await cache.match(url),hash,url)){
    const response=await verified(await fetch(url),hash,url);if(!response)throw Error('Package update available — run npm run gallery');await cache.put(url,response);
   }
   port?.postMessage({text:'Saving gallery packages: '+(++count)+'/'+entries.length});
  }port?.postMessage({done:true,text:'Gallery packages available offline. Other packages require internet.'});
  }catch(error){port?.postMessage({done:true,text:'Offline package setup failed: '+error.message});}
 })());return;}
 if(!['offline-status','repair-offline'].includes(event.data?.type))return;
 event.waitUntil((async()=>{try{
  if(event.data.type==='repair-offline')await populate();const cache=await caches.open(CACHE);
  let ready=true;for(const asset of OfflineAssets.assets){const url=absolute(asset);if(!await verified(await cache.match(url),assetHash(url),url)){ready=false;break;}}
  event.ports[0]?.postMessage({ready,version:CACHE});
 }catch{event.ports[0]?.postMessage({ready:false});}})());
});
