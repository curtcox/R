const test = require('node:test'); const assert = require('node:assert/strict');
const Client = require('../src/r-client.js');
function setup(lowMemory = false) {
  const workers = [], messages = [], callbacks = new Map(); let next = 0;
  const timers = { setTimeout(fn, ms) { callbacks.set(++next, { fn, ms }); return next; }, clearTimeout(id) { callbacks.delete(id); } };
  const client = new Client({ createWorker() { const worker = { postMessage(value) { this.sent = value; }, terminate() { this.terminated = true; }, emit(data) { this.onmessage({ data }); } }; workers.push(worker); return worker; }, onMessage: item => messages.push(item), timers, lowMemory });
  return { client, workers, messages, callbacks };
}
test('ready worker runs and preloads a spare; stop swaps immediately', () => {
  const { client, workers } = setup(); client.run('print(1)'); assert.equal(workers[0].sent, undefined);
  workers[0].emit({ type:'ready' }); assert.equal(workers[0].sent.source, 'print(1)'); assert.equal(workers.length, 2);
  workers[1].emit({ type:'ready' }); client.stop(); assert.ok(workers[0].terminated); assert.equal(client.active.worker, workers[1]);
  client.run('print(2)'); assert.equal(workers[1].sent.source, 'print(2)'); client.dispose();
});
test('latest edit supersedes a run and stale output is ignored', () => {
  const { client, workers, messages } = setup(); workers[0].emit({ type:'ready' }); workers[1].emit({ type:'ready' });
  const id = client.run('old'); client.run('new'); workers[0].emit({ type:'text', id, text:'stale' });
  assert.ok(workers[0].terminated); assert.equal(workers[1].sent.source, 'new'); assert.ok(!messages.some(i => i.text === 'stale')); client.dispose();
});
test('auto timer starts at execution, manual runs have only a soft warning', () => {
  const { client, workers, callbacks, messages } = setup(true); workers[0].emit({ type:'ready' });
  const id = client.run('while True: pass', '', 'auto'); assert.equal(callbacks.size, 0);
  workers[0].emit({ type:'running', id }); assert.equal([...callbacks.values()][0].ms, 5000); [...callbacks.values()][0].fn();
  assert.match(messages.at(-1).text, /Stopped after 5 s/); assert.equal(workers.length, 2);
  workers[1].emit({ type:'ready' }); const manual = client.run('manual'); workers[1].emit({ type:'running', id:manual });
  assert.equal([...callbacks.values()][0].ms, 60000); client.dispose();
});
