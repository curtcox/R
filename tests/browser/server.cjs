const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const CDN='https://cdn.jsdelivr.net/npm/webr@0.6.0/dist/';
const REPO='https://repo.r-wasm.org/bin/emscripten/contrib/4.6/';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
const sha=body=>crypto.createHash('sha256').update(body).digest('hex');
function createServer(){
 let base;const cidRequests=new Map();
 function fileFor(url){
  if(url.startsWith('/__webr__/'))return path.join(root,'node_modules/webr/dist',url.slice(10));
  if(url==='/__packages__/PACKAGES')return path.join(root,'src/gallery-packages.dcf');
  if(url.startsWith('/__packages__/'))return path.join(root,'.webr-cache',path.basename(url));
  if(url.startsWith('/__256t__/'))return path.join(root,'tests/fixtures/256t',path.basename(url));
  return path.resolve(root,'.'+(url==='/'?'/index.html':url));
 }
 function served(file,url){
  let data=fs.readFileSync(file);
  if(/\.(js|mjs|html|json)$/.test(file)&&!file.includes('node_modules')&&!file.includes('/vendor/'))data=Buffer.from(data.toString().replaceAll(CDN,base+'/__webr__/').replaceAll(REPO,base+'/__packages__/'));
  if(path.basename(file)==='t256-bridge.js')data=Buffer.from(data.toString().replace('https://256t.us/',base+'/__256t__/'));
  if(path.extname(file)==='.html')data=Buffer.from(data.toString().replace("connect-src 'self' https:","connect-src 'self' https: "+base));
  if(path.basename(file)==='index.html'&&url?.searchParams.has('hashbin-test'))data=Buffer.from(data.toString().replace('name="hashbin-client-id" content=""','name="hashbin-client-id" content="test-client"'));
  if(path.basename(file)==='hashbin.js'&&url?.searchParams.has('fixture'))data=Buffer.from(data.toString());
  return data;
 }
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=fileFor(decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('Not found');return;}
  if(url.pathname.startsWith('/__256t__/')){const cid=path.basename(url.pathname);cidRequests.set(cid,(cidRequests.get(cid)||0)+1);}
  let data=served(file,url);
  if(path.basename(file)==='index.html'&&req.headers.cookie?.includes('ronline-test-client=1'))data=Buffer.from(data.toString().replace('name="hashbin-client-id" content=""','name="hashbin-client-id" content="test-client"'));
  if(path.basename(file)==='offline-assets.js'){
   const manifest=require('../../offline-assets.js');const convert=asset=>asset.replace(CDN,base+'/__webr__/').replace(REPO,base+'/__packages__/');
   const hashes={};
   for(const [asset,hash]of Object.entries(manifest.hashes)){
    const replacement=convert(asset);hashes[replacement]=/^https:/.test(asset)?hash:sha(served(path.join(root,asset)));
   }
   const packages={};for(const[asset,hash]of Object.entries(manifest.packageHashes||{}))packages[convert(asset)]=hash;
   data=Buffer.from('const OfflineAssets='+JSON.stringify({...manifest,webr:base+'/__webr__/',assets:manifest.assets.map(convert),hashes,packageHashes:packages})+';\nif(typeof module!=="undefined")module.exports=OfflineAssets;else globalThis.OfflineAssets=OfflineAssets;');
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'});res.end(data);
 });
 return {server,count256t:cid=>cidRequests.get(cid)||0,async start(){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(process.env.PORT||0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+server.address().port;return base;}};
}
module.exports={createServer};
if(require.main===module)createServer().start().then(base=>console.log(base)).catch(e=>{console.error(e);process.exitCode=1;});
