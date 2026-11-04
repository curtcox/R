const{test}=require('node:test'),assert=require('node:assert/strict'),corpus=require('./legacy-urls.json');
const{urlState,type,HashBinStore,config}=require('../src/fragment-config.mjs');
for(const entry of corpus.cases)test('R production adapter: '+entry.label,async()=>{
 const intent=urlState.parse(entry.href);assert.equal(intent.kind,entry.kind);
 if(entry.src)assert.equal(intent.doc.src,entry.src);
 if(entry.raw)assert.deepEqual(intent.doc,type.normalize(JSON.parse(entry.raw)));
 if(entry.kind==='cid'){assert.equal(intent.cid,entry.cid);assert.equal((await new HashBinStore({fetchSource:async()=>new Response(corpus.example.source)}).load(intent.cid)).src,corpus.example.source);}
 if(entry.kind==='example')assert.equal(intent.id,entry.id);
});
test('R reads v1 while writing legacy source/input links',()=>{
 const {createUrlState}=require('../vendor/fragment-kit-v0.3.3/src/index.js');const doc={src:'cat(readline())',r:{stdin:'Ada\n',autorun:false}};
 const modern=createUrlState({config,type}).build(doc).href;assert.deepEqual(urlState.parse(modern).doc,doc);
 const legacy=urlState.build(doc,{url:config.recoveryOrigin,run:false});assert.equal(new URL(legacy.href).hash,'');assert.deepEqual(urlState.parse(legacy.href).doc,doc);assert.equal(urlState.parse(legacy.href).run,false);
});
