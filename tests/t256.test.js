const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function bridge(){
 let calls=0;const sandbox={TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,btoa,atob,console};sandbox.self=sandbox;
 sandbox.XMLHttpRequest=class{
  open(_method,url){this.url=url;}
  send(){calls++;const file=path.join(__dirname,'fixtures/256t',this.url.split('/').at(-1));if(fs.existsSync(file)){this.response=fs.readFileSync(file);this.status=200;}else{this.status=404;}}
 };
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../vendor/sha512.min.js'),'utf8'),sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/t256-bridge.js'),'utf8'),sandbox);
 return {api:sandbox.T256Bridge,calls:()=>calls,sandbox};
}
function cid(text){const bytes=Buffer.from(text),size=Buffer.alloc(6);size.writeUIntBE(bytes.length,0,6);return size.toString('base64url')+(bytes.length<=64?bytes:crypto.createHash('sha512').update(bytes).digest()).toString('base64url');}
test('synchronous SHA-512 CIDs match Node and WebCrypto, including Unicode and boundary lengths',async()=>{
 const {api}=bridge();for(const text of ['', 'x'.repeat(64),'x'.repeat(65),'你好'.repeat(1000)]){assert.equal(api.cid(text),cid(text));if(Buffer.byteLength(text)>64)assert.equal(api.cid(text).slice(8),Buffer.from(await crypto.subtle.digest('SHA-512',Buffer.from(text))).toString('base64url'));}
});
test('fixtures verify, unwrap R envelopes, and fetch at most once',()=>{
 const {api,calls}=bridge();for(const file of fs.readdirSync(path.join(__dirname,'fixtures/256t'))){const text=fs.readFileSync(path.join(__dirname,'fixtures/256t',file),'utf8');assert.equal(api.cid(text),file);assert.equal(api.text(file),text);assert.equal(api.text(file),text);if(text.startsWith('{'))assert.equal(api.source(file),'function(x) x + 42');}
 assert.equal(calls(),1);
});
test('invalid CIDs, missing content, and substituted bytes are rejected',()=>{
 const {api,sandbox}=bridge();assert.throws(()=>api.text('bad'),/Invalid/);assert.throws(()=>api.text(cid('x'.repeat(100))),/fetch failed/);
 sandbox.XMLHttpRequest=class{open(){}send(){this.status=200;this.response=Buffer.from('y'.repeat(100));}};
 assert.throws(()=>api.text(cid('x'.repeat(100))),/does not match/);
});
