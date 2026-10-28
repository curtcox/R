// Phase-0-only cache. Its scope and cache prefix cannot affect the eventual app.
const PREFIX = 'ronline-spike-';
let manifest;
async function specification() {
  return manifest ||= fetch('offline-manifest.json', {cache:'no-store'}).then(r => r.json());
}
async function digest(response) {
  const bytes = await response.clone().arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function cacheName() {
  return PREFIX + (await digest(new Response(JSON.stringify(await specification())))).slice(0,16);
}
self.addEventListener('install', event => event.waitUntil((async()=>{
  const spec = await specification(), name = await cacheName();
  try {
    const cache = await caches.open(name);
    for (const [asset,hash] of Object.entries(spec.hashes)) {
      const response = await fetch(new URL(asset,self.location.href),{cache:'no-store'});
      if (!response.ok || await digest(response)!==hash) throw Error('Integrity mismatch: '+asset);
      await cache.put(new URL(asset,self.location.href),response);
    }
    await cache.put(new URL('offline-manifest.json',self.location.href),new Response(JSON.stringify(spec),{headers:{'Content-Type':'application/json'}}));
    await self.skipWaiting();
  } catch (error) {await caches.delete(name); throw error;}
})()));
self.addEventListener('activate', event => event.waitUntil((async()=>{
  const name=await cacheName();
  for(const old of await caches.keys())if(old.startsWith(PREFIX)&&old!==name)await caches.delete(old);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    // A restarted service worker recovers its pinned manifest from the completed cache.
    if(!manifest){
      for(const name of await caches.keys())if(name.startsWith(PREFIX)){
        const saved=await(await caches.open(name)).match(new URL('offline-manifest.json',self.location.href));
        if(saved){manifest=Promise.resolve(await saved.json());break;}
      }
    }
    const spec=await specification(),url=new URL(event.request.url);url.search='';
    const entry=Object.entries(spec.hashes).find(([asset])=>new URL(asset,self.location.href).href===url.href);
    if(entry){
      const cache=await caches.open(await cacheName()),response=await cache.match(url);
      if(response&&await digest(response)===entry[1])return response;
      if(response)await cache.delete(url);
    }
    return fetch(event.request);
  })());
});
