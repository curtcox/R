/* Editor orchestration. R and all package execution stay in the worker. */
(async () => {
const $ = id => document.getElementById(id), status = text => { $('status').textContent = text; };
const storage = kind => { try { return window[kind]; } catch (_) { return undefined; } };
const local = storage('localStorage'), session = storage('sessionStorage');
const editor = ace.edit('editor');
editor.setTheme('ace/theme/chrome'); editor.session.setMode('ace/mode/r');
editor.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true, showPrintMargin: false, tabSize: 4, useSoftTabs: true, fontSize: 14 });
editor.session.setUseWorker(false); editor.session.setUseWrapMode(true);
let attachedNames = [];
ace.require('ace/ext/language_tools').addCompleter({getCompletions(_editor,_session,_position,prefix,callback){const base=['c','list','data.frame','matrix','seq','rep','mean','median','sum','summary','plot','hist','lm','library','readline','readLines','print','cat','function','if','for','sapply','lapply','aggregate','table','factor','str','head','help'];callback(null,[...new Set([...base,...attachedNames])].filter(name=>name.startsWith(prefix)).map(name=>({caption:name,value:name,meta:'R',score:100})));}});
const output = new OutputView($('output'), line => { selectTab('code'); editor.gotoLine(line, 0, true); editor.focus(); });
let marker, applying = false, saved, clock, start, runSuppressed = false;
function snapshot() { return { src: editor.getValue(), r: { stdin: $('stdin').value, autorun: $('autorun').checked } }; }
function fingerprint() { return JSON.stringify(snapshot()); }
function persist() { try { local?.setItem('ronline:work', fingerprint()); } catch (_) { /* Private mode or quota. */ } }
function inputCount() {
  const count = $('stdin').value ? $('stdin').value.replace(/\n$/, '').split('\n').length : 0;
  $('input-count').textContent = count + (count === 1 ? ' line' : ' lines'); $('mobile-input-count').textContent = count || '';
}
function apply(value) {
  applying = true;
  editor.setValue(value.src || '', -1); $('stdin').value = value.r?.stdin || '';
  $('autorun').checked = value.r?.autorun !== false; inputCount(); applying = false; persist();
}
// Links can come from anyone; never let one silently replace work kept in this browser.
function acceptLink(incoming) {
  const same = (src, stdin) => src === editor.getValue() && (stdin || '') === $('stdin').value;
  if (same(incoming.src, incoming.r?.stdin) || RExamples.catalog.some(sample => same(sample.src, sample.stdin))) return true;
  return confirm('This link opens a different program. Replace the program saved in this browser?\n\nChoose Cancel to keep your current work.');
}
function clearAnnotation() {
  editor.session.clearAnnotations();
  if (marker != null) editor.session.removeGutterDecoration(marker, 'error-line'); marker = null;
}
function state(name) { document.body.dataset.state = name; }
// Programs, including ones from links, run in HashBin's opaque-origin sandbox.
const client = new RClient({ createWorker: RSandbox.factory(await loadHashBinSDK()), onMessage(item) {
  if (item.type === 'queued') { clearInterval(clock); output.clear(); clearAnnotation(); status(item.text); state('running'); $('stop').disabled = false; }
  else if (item.type === 'status') status(item.text);
  else if (item.type === 'completions') attachedNames = item.names;
  else if (item.type === 'running') {
    start = performance.now(); status('Running…');
    clock = setInterval(() => status(`Running ${((performance.now() - start) / 1000).toFixed(1)} s…${performance.now() - start > 60000 ? ' Use Stop to end the program.' : ''}`), 100);
  } else if (item.type === 'done') {
    clearInterval(clock); $('stop').disabled = true; state(item.ok ? 'done' : 'error');
    const error = item.error && parseTraceback(item.error);
    if (error) { marker = error.line - 1; editor.session.setAnnotations([{ row: marker, column: error.column, text: error.message, type: 'error' }]); editor.session.addGutterDecoration(marker, 'error-line'); }
    status(item.ok ? `Finished in ${(item.ms / 1000).toFixed(2)} s` : error ? `Error on line ${error.line}` : 'Error — see output');
  } else if (item.type === 'stopped' || item.type === 'fatal') {
    clearInterval(clock); $('stop').disabled = true; state(item.type === 'fatal' ? 'error' : 'idle'); status(item.text || item.error);
    if (item.type === 'stopped' && item.text !== 'Stopped') output.add({ type: 'text', stream: 'stderr', text: '\n' + item.text + '\n' });
  } else if (item.type === 'warning') status(item.text);
  else if (item.type !== 'ready') output.add(item);
}});
const scheduler = new RenderScheduler({ detect: () => {}, render: () => run('auto'), renderDelay: 750 });
function run(mode = 'manual') { scheduler.cancel(); runSuppressed = false; persist(); client.run(editor.getValue(), $('stdin').value, mode); }
$('run').onclick = () => run(); $('stop').onclick = () => { scheduler.cancel(); client.stop(); };
editor.commands.addCommand({ name: 'run-r', bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter|Ctrl-Enter' }, exec: () => run() });
document.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(); } });
function selectTab(tab) {
  $('workspace').dataset.tab = tab;
  document.querySelectorAll('[data-tab]').forEach(button => { if (button.tagName === 'BUTTON') { button.classList.toggle('selected', button.dataset.tab === tab); button.setAttribute('aria-selected', String(button.dataset.tab === tab)); } });
  if (tab === 'input') $('input-pane').querySelector('details').open = true;
  editor.resize();
}
document.querySelectorAll('.mobile-tabs button').forEach(button => button.onclick = () => selectTab(button.dataset.tab));
$('more-toggle').onclick = () => { $('more').hidden = !$('more').hidden; $('more-toggle').setAttribute('aria-expanded', String(!$('more').hidden)); editor.resize(); };
// Put the same primary actions in the mobile More panel.
const mobileActions = document.createElement('div'); mobileActions.className = 'mobile-actions'; mobileActions.style.display = 'none';
for (const [title, id] of [['Download','download-open'],['Share','share-open'],['QR code','qr-open']]) { const button = document.createElement('button'); button.textContent = title; button.onclick = () => $(id).click(); mobileActions.append(button); }
$('more').prepend(mobileActions);
$('hide-editor').onclick = () => { document.body.classList.toggle('editor-hidden'); $('hide-editor').textContent = document.body.classList.contains('editor-hidden') ? 'Show editor' : 'Hide editor'; editor.resize(); };
function resizeAt(clientX) { const bounds = $('workspace').getBoundingClientRect(); const ratio = Math.max(20, Math.min(80, (clientX - bounds.left) / bounds.width * 100)); document.documentElement.style.setProperty('--editor-width', ratio + '%'); $('splitter').setAttribute('aria-valuenow', Math.round(ratio)); editor.resize(); }
$('splitter').onpointerdown = event => { $('splitter').setPointerCapture(event.pointerId); $('splitter').onpointermove = move => resizeAt(move.clientX); };
$('splitter').onpointerup = () => { $('splitter').onpointermove = null; };
$('splitter').onkeydown = event => { if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); const width = Number($('splitter').getAttribute('aria-valuenow')) + (event.key === 'ArrowLeft' ? -3 : 3); const bounds = $('workspace').getBoundingClientRect(); resizeAt(bounds.left + bounds.width * width / 100); } };
window.addEventListener('resize', () => editor.resize());
$('clear-output').onclick = () => output.clear();
async function copy(text, target) { try { await navigator.clipboard.writeText(text); if (target) target.textContent = 'Copied'; } catch (_) { status('Copy unavailable here. Select and copy the text manually.'); } }
$('copy-output').onclick = () => copy(output.text);
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => $(button.dataset.close).close();
const shareClient = new ShareClient();
function links() { return ShareLinks.build({ url: location.href, ...snapshot(), run: !$('no-run').checked, compress: LZString.compressToEncodedURIComponent }); }
function shareURL() { return saved && saved.fingerprint === fingerprint() && !$('no-run').checked ? saved.link : links().fallback; }
function updateShare() { shareClient.cancel(); $('share-url').value = shareURL(); $('share-status').textContent = ''; }
$('share-open').onclick = () => { updateShare(); $('share-dialog').showModal(); };
$('no-run').onchange = updateShare;
$('share-copy').onclick = () => copy($('share-url').value, $('share-status'));
$('shorten').onclick = async () => { $('share-status').textContent = 'Shortening link…'; const result = await shareClient.shorten({ long: $('share-url').value, fallback: $('share-url').value }); if (!result) return; $('share-url').value = result.url; $('share-status').textContent = result.error?.message || 'Short link ready.'; };
$('share-dialog').addEventListener('close', () => shareClient.cancel());
let qrSVG = '';
$('qr-open').onclick = () => {
  const url = shareURL(), qr = encodeQr(url); $('qr-image').replaceChildren();
  $('qr-svg').disabled = $('qr-png').disabled = !qr;
  $('qr-status').textContent = !qr ? 'This URL is too long for a QR code. Save to HashBin for a shorter link.' : /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'This is a local address. Other devices cannot open it. Use the published site and Save to HashBin.' : qr.version > 20 ? 'This is a dense QR code. Save to HashBin for a shorter, easier-to-scan link.' : 'Scan to open this exact program and input.';
  if (qr) { const size = qr.size + 8; let path = ''; for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) path += `M${x+4},${y+4}h1v1h-1z`; qrSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size*6}" height="${size*6}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`; $('qr-image').innerHTML = qrSVG; }
  $('qr-dialog').showModal();
};
$('qr-svg').onclick = () => RExport.download(qrSVG, 'r-online-qr.svg', 'image/svg+xml');
$('qr-png').onclick = async () => RExport.download(await RExport.svgPNG(qrSVG), 'r-online-qr.png');
$('download-open').onclick = () => { $('download-svg').disabled = !output.current?.svg; $('download-png').disabled = !output.current; $('download-status').textContent = ''; $('download-dialog').showModal(); };
$('download-source').onclick = () => RExport.download(editor.getValue(), 'main.R');
$('download-text').onclick = () => RExport.download(output.text, 'output.txt');
$('download-svg').onclick = () => RExport.download(output.current.svg, 'drawing.svg', 'image/svg+xml');
$('download-png').onclick = async () => { try { const item = output.current; const blob = item.png ? RExport.binary64(item.png, 'image/png') : item.svg ? await RExport.svgPNG(item.svg) : item.blob; RExport.download(blob, blob.type === 'image/jpeg' ? 'image.jpeg' : 'image.png'); } catch (error) { $('download-status').textContent = 'Image download failed: ' + error.message; } };
const store = new HashBinStore({ clientId: document.querySelector('meta[name="hashbin-client-id"]').content, redirectUri: new URL('./', location.href).href, storage: session, transactionStorage: session });
let linkLoad = false;
const panel = new HashBinPanel({ store, getSnapshot: snapshot, getFingerprint: fingerprint,
  onLoad(value, cid) { if (linkLoad && !acceptLink(value)) { history.replaceState(null, '', links().fallback); return false; } apply(value); saved = { fingerprint: fingerprint(), link: HashBinDocuments.link(location.href, cid) }; history.replaceState(null, '', saved.link); if ($('autorun').checked && !runSuppressed) run('auto'); else status('Ready — press Run (Ctrl+Enter)'); },
  onSaved(cid, value, link) { saved = { fingerprint: value, link }; history.replaceState(null, '', link); $('hashbin-cid').value = cid; }
});
function edited() {
  if (applying) return;
  panel.cancelLoad(); persist(); inputCount(); clearAnnotation();
  if (saved) { saved = null; history.replaceState(null, '', links().fallback); }
  if ($('share-dialog').open) updateShare();
  scheduler.cancel(); if ($('autorun').checked) scheduler.schedule({ detect: false });
}
editor.session.on('change', edited); $('stdin').oninput = edited;
$('autorun').onchange = () => { edited(); if ($('autorun').checked) run('auto'); };
window.addEventListener('offline-before-reload', persist);
window.addEventListener('beforeunload', persist);
$('offline-packages').onclick = async () => {
  if (!navigator.serviceWorker?.controller) { $('package-status').textContent = 'Wait for offline setup, then retry.'; return; }
  $('offline-packages').disabled = true; $('package-status').textContent = 'Preparing package list…';
  const channel = new MessageChannel(); const timeout = setTimeout(() => { $('offline-packages').disabled = false; $('package-status').textContent = 'Package setup timed out. Reconnect and retry.'; channel.port1.close(); }, 180000);
  channel.port1.onmessage = ({data}) => { $('package-status').textContent = data.text; if (data.done) { clearTimeout(timeout); $('offline-packages').disabled = false; channel.port1.close(); } };
  navigator.serviceWorker.controller.postMessage({ type: 'cache-packages' }, [channel.port2]);
};
let initial = { src: RExamples.catalog[0].src, r: { stdin: RExamples.catalog[0].stdin, autorun: true } };
try { const restored = JSON.parse(local?.getItem('ronline:work') || 'null'); if (restored && typeof restored.src === 'string') initial = restored; } catch (_) { /* Fresh document. */ }
apply(initial);
try {
  const parsed = ShareLinks.parse(location.href, LZString.decompressFromEncodedURIComponent);
  runSuppressed = new URL(location.href).searchParams.get('run') === '0';
  store.retireLegacyTokens().catch(() => { /* Retried on the next load. */ });
  if (parsed?.kind === 'publish') {
    const published = await store.published(location.hash);
    if (published.snapshot) apply(published.snapshot);
    if (published.cid) { saved = { fingerprint: fingerprint(), link: HashBinDocuments.link(location.href, published.cid) }; $('hashbin-cid').value = published.cid; }
    history.replaceState(null, '', saved ? saved.link : links().fallback);
    $('hashbin-status').textContent = published.error || 'Saved to HashBin.';
  }
  else if (parsed?.kind === 'source') { if (acceptLink(parsed)) apply(parsed); else history.replaceState(null, '', links().fallback); }
  else if (parsed?.kind === 'example') { const sample = RExamples.catalog.find(value => value.id === parsed.id); if (!sample) throw Error('Sample not found. Open the Sample gallery to choose a program.'); const value = { src: sample.src, r: { stdin: sample.stdin, autorun: true } }; if (acceptLink(value)) apply(value); else history.replaceState(null, '', links().fallback); }
  if (parsed?.kind === 'cid') { $('hashbin-cid').value = parsed.cid; linkLoad = true; await panel.load(parsed.cid); linkLoad = false; }
  else if ($('autorun').checked && !runSuppressed) run('auto');
  else status('Ready — press Run (Ctrl+Enter)');
} catch (error) { state('error'); status(error.message); }
// Pasting a saved fragment into the current tab is a same-document navigation.
window.addEventListener('hashchange', async () => {
  try {
    const parsed = ShareLinks.parse(location.href, LZString.decompressFromEncodedURIComponent);
    runSuppressed = parsed?.run === false;
    if (parsed?.kind === 'cid') { $('hashbin-cid').value = parsed.cid; linkLoad = true; await panel.load(parsed.cid); linkLoad = false; }
    else if (parsed?.kind === 'source') { if (!acceptLink(parsed)) { history.replaceState(null, '', links().fallback); return; } panel.cancelLoad(); saved = null; apply(parsed); if ($('autorun').checked && !runSuppressed) run('auto'); }
  } catch (error) { status(error.message); state('error'); }
});
// A small public inspection surface is useful for accessibility tools and integration tests.
globalThis.ROnline = { editor, client, output, snapshot, run, selectTab };
})();
