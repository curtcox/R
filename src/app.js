import { mountRAi } from './ai.mjs';
import { handleAiCallback } from '../vendor/fragment-kit-v0.4.3/src/ai/index.js';
let aiCallback=false,aiCallbackError;
try {aiCallback=handleAiCallback();}catch(error){aiCallbackError=error;}
import {LocalDrafts,RenderScheduler,HashBinPanel,compactShell,createShell,mountMobileTabs,createShareDialog,createQrDialog} from '../vendor/fragment-kit-v0.4.3/src/index.js';
import {config,type,urlState,HashBinDocuments,HashBinStore,LZString,loadExecutionSDK} from './fragment-config.mjs';
Object.assign(globalThis,{HashBinDocuments,LZString}); // t256 verification and established URL inspection surface.
/* Editor orchestration. R and all package execution stay in the worker. */
(async () => {
if(aiCallback||aiCallbackError){document.getElementById("status").textContent=aiCallbackError?.message||"AI connection returned to the original popup.";return;}
let ai=null,aiHoldRun=false;
let navigationError=null;
const $ = id => document.getElementById(id), status = text => { $('status').textContent = navigationError??text; };
const storage = kind => { try { return window[kind]; } catch (_) { return undefined; } };
const local = storage('localStorage'), session = storage('sessionStorage');
let navigationRevision=0,qrSave=false;
const oldHeader=document.querySelector('header'),brand=oldHeader.querySelector('.brand');oldHeader.remove();
const shell=createShell({config});shell.header.querySelector('.fk-brand').replaceChildren(...brand.childNodes);shell.header.querySelector('.fk-brand').href=new URL('./',location.href).href;shell.toolbar.remove();shell.status.remove();
compactShell({header:shell.header,toolbar:document.querySelector(".toolbar"),status:document.querySelector("body > footer")});
shell.header.querySelector('.fk-more').id='more-toggle';document.querySelector('.toolbar>#more-toggle').remove();
shell.drawer.body.append($('more'));$('more').hidden=false;
for(const id of ['hashbin-save','hashbin-load','hashbin-cid','hashbin-status','hashbin-dialog','share-dialog','qr-dialog'])$(id).remove();
const drafts = new LocalDrafts({ storage: local, key: 'ronline:work' });
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
function persist(edit = false) { drafts.attempt(snapshot(), edit === true); }
function inputCount() {
  const count = $('stdin').value ? $('stdin').value.replace(/\n$/, '').split('\n').length : 0;
  $('input-count').textContent = count + (count === 1 ? ' line' : ' lines'); if($('mobile-input-count'))$('mobile-input-count').textContent=count||'';
}
function apply(value) {
  applying = true;
  editor.setValue(value.src || '', -1); $('stdin').value = value.r?.stdin || '';
  $('autorun').checked = value.r?.autorun !== false; inputCount(); applying = false; drafts.opened();
}
function clearAnnotation() {
  editor.session.clearAnnotations();
  if (marker != null) editor.session.removeGutterDecoration(marker, 'error-line'); marker = null;
}
function state(name) { document.body.dataset.state = name; }
// Programs, including ones from links, run in HashBin's opaque-origin sandbox.
const sdk=await loadExecutionSDK();
const makeClient=()=>new RClient({ createWorker: RSandbox.factory(sdk), onMessage(item) {
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
let client=makeClient();
const scheduler = new RenderScheduler({ detect: () => {}, render: () => run('auto'), renderDelay: 750 });
function run(mode = 'manual') { navigationError=null; scheduler.cancel(); runSuppressed = false; aiHoldRun=false; persist(); client.run(editor.getValue(), $('stdin').value, mode); }
$('run').onclick = () => run(); $('stop').onclick = () => { scheduler.cancel(); client.stop(); };
editor.commands.addCommand({ name: 'run-r', bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter|Ctrl-Enter' }, exec: () => run() });
document.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(); } });
document.querySelector('.mobile-tabs').remove();
const mobile=matchMedia('(max-width:767px)');let activePanel=-1;
const moveInput=()=>{(mobile.matches||activePanel!==-1?$('workspace'):$('code-pane')).append($('input-pane'));};moveInput();mobile.addEventListener('change',moveInput);
const labels=['code','output','input'];
const tabs=mountMobileTabs({desktop:true,container:document.querySelector('.toolbar'),panels:[{label:'Code',panel:$('code-pane')},{label:'Output',panel:$('output-pane')},{label:'Input',panel:$('input-pane')}],onChange:index=>{
  activePanel=index;moveInput();document.body.classList.remove('editor-hidden');$('hide-editor').textContent=index===-1||index===0?'Hide editor':'Show editor';$('workspace').dataset.tab=index===-1?'split':labels[index];if(index===2)$('input-pane').querySelector('details').open=true;editor.resize();
}});
for(const [index,button]of [...document.querySelectorAll('.fk-tabs button')].slice(0,3).entries()){button.id=labels[index]+'-tab';$(labels[index]==='code'?'code-pane':labels[index]+'-pane').setAttribute('aria-labelledby',button.id);}
function selectTab(tab){tabs.select(labels.indexOf(tab));}
if(mobile.matches)selectTab('output');
$('hide-editor').onclick = () => tabs.select(tabs.getView()==='split'||tabs.getView()===0?1:'split');
function resizeAt(clientX) { const bounds = $('workspace').getBoundingClientRect(); const ratio = Math.max(20, Math.min(80, (clientX - bounds.left) / bounds.width * 100)); document.documentElement.style.setProperty('--editor-width', ratio + '%'); $('splitter').setAttribute('aria-valuenow', Math.round(ratio)); editor.resize(); }
$('splitter').onpointerdown = event => { $('splitter').setPointerCapture(event.pointerId); $('splitter').onpointermove = move => resizeAt(move.clientX); };
$('splitter').onpointerup = () => { $('splitter').onpointermove = null; };
$('splitter').onkeydown = event => { if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); const width = Number($('splitter').getAttribute('aria-valuenow')) + (event.key === 'ArrowLeft' ? -3 : 3); const bounds = $('workspace').getBoundingClientRect(); resizeAt(bounds.left + bounds.width * width / 100); } };
window.addEventListener('resize', () => editor.resize());
$('clear-output').onclick = () => output.clear();
async function copy(text, target) { try { await navigator.clipboard.writeText(text); if (target) target.textContent = 'Copied'; } catch (_) { status('Copy unavailable here. Select and copy the text manually.'); } }
$('copy-output').onclick = () => copy(output.text);
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => $(button.dataset.close).close();
function links(){return urlState.build(snapshot(),{run:!runSuppressed});}
function shareURL(){return saved?.fingerprint===fingerprint()?saved.link:links().href;}
const openSave=()=>panel.openSave();
const share=createShareDialog({urlState,getSnapshot:snapshot,onSave:openSave});
const qr=createQrDialog({config,urlState,onLoad:async outcome=>{
  if(outcome.kind==='cid'){await panel.load(outcome.cid);return;}
  // A scanned application URL is explicit and uses the same navigation revision guard.
  const url=new URL(outcome.href);history.pushState(null,'',location.pathname+url.search+url.hash);await openURL();
},onSave:()=>{qrSave=true;qr.dialog.close();return openSave();}});
$('share-open').onclick=()=>{shell.drawer.dialog.close();share.open();};
$('qr-open').onclick=()=>{shell.drawer.dialog.close();qr.open(shareURL());};
$('download-open').onclick = () => { $('download-svg').disabled = !output.current?.svg; $('download-png').disabled = !output.current; $('download-status').textContent = ''; $('download-dialog').showModal(); };
$('download-source').onclick = () => RExport.download(editor.getValue(), 'main.R');
$('download-text').onclick = () => RExport.download(output.text, 'output.txt');
$('download-svg').onclick = () => RExport.download(output.current.svg, 'drawing.svg', 'image/svg+xml');
$('download-png').onclick = async () => { try { const item = output.current; const blob = item.png ? RExport.binary64(item.png, 'image/png') : item.svg ? await RExport.svgPNG(item.svg) : item.blob; RExport.download(blob, blob.type === 'image/jpeg' ? 'image.jpeg' : 'image.png'); } catch (error) { $('download-status').textContent = 'Image download failed: ' + error.message; } };
const store=new HashBinStore({legacyStorage:session});
const panel=new HashBinPanel({store,urlState,container:$('more'),getSnapshot:snapshot,getFingerprint:fingerprint,
  onLoad(value,cid){ai?.cancel();navigationRevision++;urlState.cancel();scheduler.cancel();if(client.busy)client.stop();output.clear();clearAnnotation();state('idle');apply(value);
    const link=cid?urlState.link(location.href,cid):links().href;saved=cid?{fingerprint:fingerprint(),link}:null;history.replaceState(null,'',link);
    if($('autorun').checked&&!runSuppressed)run('auto');else status('Ready — press Run (Ctrl+Enter)');},
  onSaved(cid,value,link){urlState.cancel();saved={fingerprint:value,link};history.replaceState(null,'',link);$('hashbin-cid').value=cid;
    if(qrSave){qrSave=false;panel.dialog.close();qr.open(link);}}
});
panel.dialog.addEventListener('close',()=>{qrSave=false;});
function edited() {
  if (applying) return;navigationError=null;
  navigationRevision++;urlState.cancel();panel.cancelLoad(); persist(true); inputCount(); clearAnnotation();
  saved=null;urlState.write(snapshot(),{run:!runSuppressed});
  scheduler.cancel(); if ($('autorun').checked&&!aiHoldRun) scheduler.schedule({ detect: false });
}
editor.session.on('change', edited); $('stdin').oninput = edited;
$('autorun').onchange = () => { edited(); if ($('autorun').checked&&!aiHoldRun) run('auto'); };
window.addEventListener('offline-before-reload', persist);
window.addEventListener('beforeunload', persist);
drafts.mount($('more'), value => { ai?.cancel(); panel.cancelLoad(); scheduler.cancel(); client.stop(); output.clear(); clearAnnotation(); saved = null; apply(value); history.replaceState(null, '', links().fallback); selectTab('code'); status('Saved work restored — press Run.'); });
$('offline-packages').onclick = async () => {
  if (!navigator.serviceWorker?.controller) { $('package-status').textContent = 'Wait for offline setup, then retry.'; return; }
  $('offline-packages').disabled = true; $('package-status').textContent = 'Preparing package list…';
  const channel = new MessageChannel(); const timeout = setTimeout(() => { $('offline-packages').disabled = false; $('package-status').textContent = 'Package setup timed out. Reconnect and retry.'; channel.port1.close(); }, 180000);
  channel.port1.onmessage = ({data}) => { $('package-status').textContent = data.text; if (data.done) { clearTimeout(timeout); $('offline-packages').disabled = false; channel.port1.close(); } };
  navigator.serviceWorker.controller.postMessage({ type: 'cache-packages' }, [channel.port2]);
};
async function openURL() {
  ai?.cancel();navigationError=null;const ownRevision=++navigationRevision;urlState.cancel();panel.cancelLoad(); scheduler.cancel(); if (client.busy) client.stop(); saved = null;
  output.clear(); clearAnnotation();
  state('idle');
  try {
    const parsed = urlState.parse(location.href);
    aiHoldRun=false;runSuppressed = new URL(location.href).searchParams.get('run') === '0';
    if (parsed?.kind === 'publish') {
      const published = await store.published(location.hash);
      if(ownRevision!==navigationRevision)return;
      if (published?.snapshot) apply(published.snapshot);
      if (published?.cid) { saved = { fingerprint: fingerprint(), link: HashBinDocuments.link(location.href, published.cid) }; $('hashbin-cid').value = published.cid; }
      history.replaceState(null, '', saved ? saved.link : links().fallback);
      $('hashbin-status').textContent = published?.error || 'Saved to HashBin.';
    }
    else if (parsed.kind==='source') apply(parsed.doc);
    else if (parsed.kind==='example'||parsed.kind==='none') {
      const sample = parsed.kind==='example' ? RExamples.catalog.find(value => value.id === parsed.id) : RExamples.catalog[0];
      if (!sample) throw Error('Sample not found. Open the Sample gallery to choose a program.');
      apply({ src: sample.src, r: { stdin: sample.stdin, autorun: true } });
      if(parsed.kind==='example')history.replaceState(null,'',links().href);
    }
    if (parsed?.kind === 'cid') { $('hashbin-cid').value = parsed.cid; await panel.load(parsed.cid);if(ownRevision===navigationRevision&&panel.status.textContent!=='Loaded from HashBin.'){navigationError=panel.status.textContent;status(navigationError);} }
    else if ($('autorun').checked && !runSuppressed) run('auto');
    else status('Ready — press Run (Ctrl+Enter)');
  } catch (error) {if(ownRevision===navigationRevision){navigationError=error.message;state('error');status(error.message);}}finally{document.body.dataset.ready='true';}
}
store.retireLegacyTokens().catch(() => { /* Retried on the next load. */ });
// Pasting a saved fragment into the current tab uses the same URL resolution as startup.
let lastNavigation=location.href;const navigate=event=>{if(event.type==='hashchange'&&event.newURL!==location.href)return;if(location.href===lastNavigation)return;lastNavigation=location.href;void openURL();};window.addEventListener('hashchange',navigate);window.addEventListener('popstate',navigate);
ai=await mountRAi({config,type,urlState:{...urlState,commit:(doc,options)=>urlState.commit(doc,{...options,run:false})},sdk,getSnapshot:snapshot,getFingerprint:fingerprint,container:$('more'),status,onApply:value=>{
  scheduler.cancel();if(client.busy)client.stop();runSuppressed=true;aiHoldRun=true;apply(value);edited();scheduler.cancel();clearAnnotation();status('AI change accepted — press Run (Ctrl+Enter).');
}});
window.addEventListener('pagehide',()=>{clearInterval(clock);scheduler.cancel();client.dispose();ai?.cancel();ai?.ai.disconnect();});
window.addEventListener('pageshow',event=>{if(event.persisted){client=makeClient();if(globalThis.ROnline)ROnline.client=client;$('stop').disabled=true;state(navigationError?'error':'idle');status('Ready — press Run (Ctrl+Enter).');}});
await openURL();
// A small public inspection surface is useful for accessibility tools and integration tests.
globalThis.ROnline = { editor, client, output, snapshot, run, selectTab, ai };
})();
