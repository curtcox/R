const test = require('node:test'); const assert = require('node:assert/strict');
const { HashBinDocuments: D, HashBinStore } = require('../src/hashbin.js');
const { ShareLinks: S, ShareClient } = require('../src/share-links.js');
const LZ = require('../vendor/lz-string.min.js');
const compress = LZ.compressToEncodedURIComponent, decompress = LZ.decompressFromEncodedURIComponent;
function cid(text) { const data = Buffer.from(text); return Buffer.from([0,0,0,0,0,data.length]).toString('base64url') + data.toString('base64url'); }
test('compressed source and stdin documents round trip; run=0 is preserved', () => {
  for (const r of [{stdin:''}, {stdin:'3\n4\n',autorun:false}]) {
    const link = S.build({url:'https://curtcox.github.io/R/?old=x#old',src:'print("你好")', r, run:false, compress});
    const parsed = S.parse(link.fallback, decompress); assert.equal(parsed.src,'print("你好")'); assert.equal(parsed.r.stdin,r.stdin); assert.equal(parsed.run,false);
  }
});
test('plain fallback preserves stdin without compression', () => {
  const link = S.build({url:'https://example.com/',src:'print(1)',r:{stdin:'a\nb'},compress:()=>{throw Error();}});
  assert.equal(S.parse(link.fallback, decompress).r.stdin,'a\nb');
});
test('CID detection and plain R load', async () => {
  const value = cid('print(1)'); assert.ok(D.isCID(value)); assert.equal(S.parse('https://example.com/#'+value).kind,'cid');
  assert.equal((await new HashBinStore().load(value)).src,'print(1)'); assert.equal(D.isCID('print1234'),false);
  assert.deepEqual(S.parse('https://example.com/?example=star'),{kind:'example',id:'star',run:true});
});
test('documents validate versions, input and byte limits; unknown types remain text', () => {
  const doc = D.serialize({src:'print(1)',r:{stdin:'x',autorun:false}}); assert.equal(D.parse(doc).r.autorun,false);
  assert.throws(()=>D.parse(doc.replace('"version":1','"version":2')),/version/);
  assert.throws(()=>D.serialize({src:'a'.repeat(D.MAX_BYTES)}),/5 MiB/);
  assert.throws(()=>D.parse(doc.replace('"stdin":"x"','"stdin":1')),/text/);
  const unknown = doc.replace('"type":"r"','"type":"other"'); assert.equal(D.parse(unknown).src,unknown);
});
function memory() { const data = new Map(); return {data,setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k) ?? null,removeItem:k=>data.delete(k)}; }
function fullCID(text) { const data = Buffer.from(text), size = Buffer.alloc(6); size.writeUIntBE(data.length,0,6); return size.toString('base64url') + (data.length <= 64 ? data : require('node:crypto').createHash('sha512').update(data).digest()).toString('base64url'); }
test('HashBin placeholder provides clear registration guidance', async () => {
  await assert.rejects(()=>new HashBinStore().init(),/registered client ID/);
});
test('saves go through HashBin Publish with the vendored SDK release and verify the returned CID', async () => {
  const snapshot = {src:'print(1)',r:{stdin:'x',autorun:true}}, payload = D.serialize(snapshot); let options;
  const store = new HashBinStore({clientId:'id',loadSDK:async()=>({HashBinClient:class { publish(content,opts){ assert.equal(content,payload); options=opts; return Promise.resolve({cid:fullCID(payload)}); } }})});
  await assert.rejects(store.publish(payload,snapshot),/still loading/); await store.init();
  assert.equal((await store.publish(payload,snapshot)).cid,fullCID(payload)); assert.deepEqual(options,{contentType:'application/json',clientState:{snapshot},fileName:'program.json'});
  store.client.publish = async () => ({cid:fullCID(payload+' ')}); await assert.rejects(store.publish(payload,snapshot),/does not match its CID/);
  // The vendored files are the exact immutable release; hashes from https://hashbin.org/sdk/v0.3.0/integrity.json.
  const sri = file => 'sha384-'+require('node:crypto').createHash('sha384').update(require('node:fs').readFileSync(require('node:path').join(__dirname,'..',file))).digest('base64');
  assert.equal(sri('vendor/hashbin-sdk-v0.3.0.mjs'),'sha384-OrIu52nODd4k+SsDRTZjfEQq7Nu4NO7x1AtXqngPk3r2Pm5eI2Afv7nu33exMJ+a');
  assert.equal(sri('vendor/hashbin-cache-v0.3.0.js'),'sha384-OjeXeXB30xFV4yU2LmXTYzc0KsymrivM/l3f/rgDQuPsTzGVMnk6vYtck8n60EgP');
  assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/hashbin.js'),'utf8'),/'\.\.\/vendor\/hashbin-sdk-v0\.3\.0\.mjs'/);
});
test('redirect saves restore source and input after approval or cancellation', async () => {
  const transactionStorage = memory(), snapshot = {src:'print(1)',r:{stdin:'x',autorun:true}}, payload = D.serialize(snapshot); let outcome = 'approve';
  const store = new HashBinStore({clientId:'id',transactionStorage,loadSDK:async()=>({HashBinClient:class { publish(){ return Promise.resolve({redirected:true}); } async handlePublishCallback(){ if (outcome !== 'approve') throw Object.assign(new Error('access_denied'),{clientState:{snapshot}}); return {cid:fullCID(payload),clientState:{snapshot}}; } }})});
  await store.init(); assert.equal(await store.published('#'+cid('print(1)')),null); assert.equal(S.parse('https://example.com/#hashbin_publish=s&cid=x').kind,'publish');
  await store.publish(payload,snapshot); assert.deepEqual(await store.published('#hashbin_publish=s&cid=x'),{cid:fullCID(payload),snapshot});
  await store.publish(payload,snapshot); outcome = 'cancel'; assert.deepEqual(await store.published('#hashbin_publish=s&error=access_denied'),{error:'The save was cancelled on HashBin.',snapshot}); assert.equal(transactionStorage.data.size,0);
});
test('tokens left by the earlier OAuth flow are revoked server-side before they are cleared', async () => {
  const storage = memory(); let loaded = 0, revoked = 0;
  const store = new HashBinStore({clientId:'id',storage,loadSDK:async()=>{ loaded++; return {HashBinClient:class { async disconnect(){ revoked++; storage.data.clear(); } }}; }});
  assert.equal(await store.retireLegacyTokens(),false); assert.equal(loaded,0);
  storage.setItem('hashbin:tokens:id','{"refreshToken":"old"}'); assert.equal(await store.retireLegacyTokens(),true); assert.equal(revoked,1);
});
test('remote loads verify bytes against the CID', async () => {
  const text = 'print("verified")\n' + '#'.repeat(70), served = body => new HashBinStore({fetchSource:async()=>({ok:true,status:200,arrayBuffer:async()=>new TextEncoder().encode(body).buffer})});
  assert.equal((await served(text).load(fullCID(text))).src,text);
  await assert.rejects(served(text.replace('verified','forged')).load(fullCID(text)),/does not match its CID/);
});
test('shortener accepts only is.gd links and preserves source on provider failure', async () => {
  const links={long:'https://example.com/',fallback:'https://example.com/'};
  let result = await new ShareClient({fetchLink:async()=>({ok:true,json:async()=>({contents:'https://is.gd/abc'})})}).shorten(links); assert.equal(result.shortened,true);
  result = await new ShareClient({fetchLink:async()=>({ok:true,json:async()=>({contents:'Error: URL too long'})})}).shorten(links); assert.equal(result.shortened,false); assert.match(result.error.message,/HashBin/);
});
