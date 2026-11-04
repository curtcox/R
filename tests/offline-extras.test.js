const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createHash}=require('node:crypto');
test('upgrade retains only verified legacy packages and excludes them from app readiness',async()=>{
 const url='https://packages.example/a.tgz',bad='https://packages.example/b.tgz',stores=new Map(),events={};
 const hash=text=>createHash('sha256').update(text).digest('hex');
 const caches={async keys(){return [...stores.keys()]},async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return{async match(key){return data.get(key)?.clone()},async put(key,value){data.set(key,value.clone())},async delete(key){data.delete(key)}}}};
 const legacy=await caches.open('ronline-legacy');await legacy.put(url,new Response('valid'));await legacy.put(bad,new Response('poison'));
 const self={registration:{scope:'https://app.example/R/'},addEventListener(name,callback){events[name]=callback}};
 const sandbox={self,OfflineAssets:{packageHashes:{[url]:hash('valid'),[bad]:hash('expected')}},caches,crypto,Response,URL,Headers,fetch(){throw Error('Upgrade must retain packages without network')}};
 vm.runInNewContext(fs.readFileSync('vendor/hashbin-cache-v0.3.0.js','utf8'),sandbox);
 vm.runInNewContext(fs.readFileSync('src/offline-extras.js','utf8'),sandbox);
 let pending;events.install({waitUntil(value){pending=value}});await pending;
 const saved=await caches.open('ronline-packages-v1');assert.equal(await(await saved.match(url)).text(),'valid');assert.equal(await saved.match(bad),undefined);
 assert.equal(self.FragmentKitOfflineConfig.extraCaches[0],'ronline-packages-v1');assert.equal(self.FragmentKitOfflineConfig.preserveCache('ronline-spike-old'),true);
 assert.equal(self.FragmentKitOfflineConfig.preserveCache('ronline-old'),false);
 assert.equal(sandbox.OfflineAssets.assets,undefined,'packages are metadata, never required app assets');
});
