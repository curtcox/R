const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=require('../offline-assets.js'),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
test('every shipped local asset matches the generated offline manifest',()=>{
 assert.match(manifest.version,/^ronline-[a-f0-9]{16}$/);
 for(const asset of manifest.assets)if(!/^https:/.test(asset))assert.equal(sha(fs.readFileSync(path.join(root,asset))),manifest.hashes[asset],asset);
});
test('editor and gallery CSP keep the approved runtime policy and opaque bootstrap hash',()=>{
 const pages=['index.html','gallery.html'].map(name=>fs.readFileSync(path.join(root,name),'utf8'));
 const policies=pages.map(text=>text.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]);assert.equal(policies[0],policies[1]);
 for(const policy of policies){for(const value of ["'unsafe-eval'","'wasm-unsafe-eval'",'sha256-IMEqdP+AkCKdxhM3X7mQM4pV/chykJXPvdtndD+XeH8=',"worker-src 'self' blob:","object-src 'none'"])assert.ok(policy.includes(value),value);}
 assert.match(pages[0],/name="hashbin-client-id" content=""/);
 assert.match(pages[0],/main\.R/);assert.match(pages[0],/R 4\.6\.0 · webR 0\.6\.0/);
 for(const page of pages)for(const match of page.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"#]*)?"/g))if(!/^(?:https?:|\.\/\?)/.test(match[1]))assert.ok(fs.existsSync(path.join(root,match[1])),match[1]);
});
test('all pinned runtime files, package names, and PWA icons are represented',()=>{
 const runtime=require('../src/runtime-files.json'),remote=require('../scripts/remote-hashes.json');
 for(const name of ['webr-worker.js','R.js','R.wasm',...runtime.startup,...runtime.lazy])assert.ok(remote[manifest.webr+name],name);
 assert.deepEqual(Object.entries(remote),Object.entries(manifest.hashes).filter(([name])=>name.startsWith(manifest.webr)));
 const packages=require('../scripts/package-hashes.json');for(const name of ['ggplot2','dplyr','tidyr','jsonlite','knitr'])assert.ok(packages.packages[name]);
 assert.deepEqual(manifest.packageHashes,packages.hashes);
 for(const size of [180,192,512]){const png=fs.readFileSync(path.join(root,'icons/icon-'+size+'.png'));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
test('Markdown escapes markup and rejects executable link protocols',()=>{
 const {markdown}=require('../src/output-view.js');const rendered=markdown('<script>alert(1)</script>\n[bad](javascript:alert(1))\n[good](https://r-project.org/)');
 assert.doesNotMatch(rendered,/<script|href="javascript:/);assert.match(rendered,/&lt;script&gt;/);assert.match(rendered,/href="https:\/\/r-project.org\//);
});
