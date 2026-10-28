if ('serviceWorker' in navigator && !navigator.serviceWorker.controller && location.search.includes('offline-test')) {
  await navigator.serviceWorker.register('service-worker.js');
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
}
import { createSandbox } from '../vendor/hashbin-sdk-v0.3.0.mjs';
const base = new URL('../node_modules/webr/dist/', location.href).href;
const files = await fetch('runtime-files.json').then(r => r.json());
const worker = await fetch('worker.js').then(r => r.text());
const engine = await fetch(base + 'webr-worker.js').then(r => r.text());
const source = `const baseUrl = ${JSON.stringify(base)}, runtimeFiles = ${JSON.stringify(files)};\n${worker}\n${engine}\nboot();`;
globalThis.events = [];
globalThis.sandbox = createSandbox({source, base, proxy:[base]});
sandbox.onmessage = ({data}) => { events.push(data); document.getElementById('output').textContent = JSON.stringify(events, null, 2); };
sandbox.onerror = e => { events.push({type:'fatal',error:e.message}); document.getElementById('output').textContent = JSON.stringify(events,null,2); };
