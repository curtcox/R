/* Package and spike cache policy belongs to R, outside app-readiness accounting. */
(() => {
const packageCache='ronline-packages-v1',absolute=name=>new URL(name,self.registration.scope).href;
const hashes=OfflineAssets.packageHashes??{},verified=HashBinCache.verify;
// Transfer verified package entries from the old all-in-one cache before the kit
// removes obsolete app caches during activation. No network is needed to retain them.
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const names=(await caches.keys()).filter(name=>name.startsWith('ronline-')&&!name.startsWith('ronline-spike-')&&name!==packageCache);
  const destination=await caches.open(packageCache);
  for(const[url,hash]of Object.entries(hashes)){
    if(await verified(await destination.match(url),hash,url))continue;
    for(const name of names){const checked=await verified(await(await caches.open(name)).match(url),hash,url);if(checked){await destination.put(url,checked);break;}}
  }
})()));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.url===absolute('offline-assets.js')){
    event.respondWith(new Response('globalThis.OfflineAssets='+JSON.stringify(OfflineAssets)+';',{headers:{'Content-Type':'text/javascript'}}));return;
  }
  const expected=hashes[event.request.url];if(!expected)return;
  event.respondWith((async()=>{
    const cache=await caches.open(packageCache),cached=await verified(await cache.match(event.request.url),expected,event.request.url);
    if(cached)return cached;await cache.delete(event.request.url);
    const response=await fetch(event.request),checked=await verified(response.clone(),expected,event.request.url);
    if(checked){await cache.put(event.request.url,checked.clone());return checked;}
    return response; // A rebuilt package can execute online, but is never cached as the pinned package.
  })());
});
self.FragmentKitOfflineConfig={extraCaches:[packageCache],preserveCache:name=>name.startsWith('ronline-spike-'),downloadConcurrency:6,
  onMessage(event){if(event.data?.type!=='cache-packages')return;
    return(async()=>{
      const port=event.ports[0],cache=await caches.open(packageCache),entries=Object.entries(hashes);let count=0;
      try{for(const[url,hash]of entries){if(!await verified(await cache.match(url),hash,url)){
        const checked=await verified(await fetch(url),hash,url);if(!checked)throw Error('Package update available — run npm run gallery');await cache.put(url,checked);
      }port?.postMessage({text:'Saving gallery packages: '+(++count)+'/'+entries.length});}
      port?.postMessage({done:true,text:'Gallery packages available offline. Other packages require internet.'});
      }catch(error){port?.postMessage({done:true,text:'Offline package setup failed: '+error.message});}
    })();
  }
};
})();
