const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sha = data => createHash('sha256').update(data).digest('hex');

test('the spike keeps the planned strict CSP in checked-in HTML', () => {
  const html = fs.readFileSync(path.join(root,'spike/index.html'),'utf8');
  assert.match(html, /'wasm-unsafe-eval'/);
  assert.doesNotMatch(html, /(?:^|\s)'unsafe-eval'(?:\s|;)/);
  assert.match(html, /sha256-IMEqdP\+AkCKdxhM3X7mQM4pV\/chykJXPvdtndD\+XeH8=/);
});

test('offline spike manifest matches the exact local pinned runtime and harness bytes', () => {
  assert.equal(require('../node_modules/webr/package.json').version, '0.6.0');
  const {hashes} = require('../spike/offline-manifest.json');
  for(const [name,hash] of Object.entries(hashes)) {
    assert.equal(sha(fs.readFileSync(path.resolve(root,'spike',name))),hash,name+' changed: run npm run spike:manifest');
  }
  for(const file of ['webr-worker.js','R.js','R.wasm','libRblas.so','libRlapack.so']) {
    assert.ok(hashes['../node_modules/webr/dist/'+file],file+' must be available offline');
  }
});

test('the sandbox SDK is the immutable Python Online 52ffb06 copy', () => {
  assert.equal(sha(fs.readFileSync(path.join(root,'vendor/hashbin-sdk-v0.3.0.mjs'))), '117c9047194a7f08daabe384d12c60c40407251ead445af81c50791828c14288');
});
