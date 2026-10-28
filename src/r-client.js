(() => {
class RClient {
  constructor({ createWorker = () => { throw Error('An opaque-origin R sandbox factory is required.'); }, onMessage = () => {}, timers = globalThis,
    lowMemory = (globalThis.navigator?.deviceMemory < 4 || /Android|iPhone|iPad/i.test(globalThis.navigator?.userAgent || '')) } = {}) {
    Object.assign(this, { createWorker, onMessage, timers, lowMemory });
    this.revision = 0; this.active = this.makeWorker();
  }
  makeWorker(spare = false) {
    const record = { worker: this.createWorker(), ready: false, spare };
    record.worker.onmessage = ({ data }) => {
      if (this.disposed) return;
      if (data.type === 'ready') {
        record.ready = true;
        if (record === this.active) {
          this.onMessage(data); this.dispatch();
          if (!this.lowMemory && !this.spare) this.spare = this.makeWorker(true);
        }
        return;
      }
      if (data.type === 'fatal' && record !== this.active) { record.failed = true; record.worker.terminate(); if (record === this.spare) this.spare = null; return; }
      if (record !== this.active) return;
      if (data.id != null && data.id !== this.revision) return;
      if (data.type === 'fatal') { record.failed = true; this.clearTimers(); this.pending = null; this.busy = false; }
      if (data.type === 'running') {
        if (this.pending?.mode === 'auto') this.timeout = this.timers.setTimeout(() => this.stop('Stopped after 5 s. Auto-run keeps runs short — press Run (Ctrl+Enter) to run without this limit.'), 5000);
        else this.warning = this.timers.setTimeout(() => this.onMessage({ type: 'warning', text: 'Still running after 60 s. Use Stop to end the program.' }), 60000);
      }
      if (data.type === 'done') { this.clearTimers(); this.busy = false; this.pending = null; }
      this.onMessage(data);
    };
    record.worker.onerror = event => {
      if (record !== this.active) { record.failed = true; record.worker.terminate(); if (record === this.spare) this.spare = null; return; }
      record.failed = true; this.clearTimers(); this.busy = false; this.pending = null;
      this.onMessage({ type: 'fatal', error: event.message || 'R worker failed to load. Check your connection and press Run to retry.' });
    };
    return record;
  }
  clearTimers() { this.timers.clearTimeout(this.timeout); this.timers.clearTimeout(this.warning); }
  replace() {
    this.active.worker.terminate();
    this.active = this.spare || this.makeWorker(); this.active.spare = false; this.spare = null;
    if (!this.lowMemory && this.active.ready) this.spare = this.makeWorker(true);
  }
  run(source, stdin = '', mode = 'manual') {
    this.clearTimers();
    if (this.busy || this.active.failed) this.replace();
    this.pending = { id: ++this.revision, source, stdin, mode }; this.busy = true;
    this.onMessage({ type: 'queued', id: this.revision, text: this.active.ready ? 'Loading packages…' : 'Loading R… (~23 MB on first visit)' });
    this.dispatch(); return this.revision;
  }
  dispatch() {
    if (this.pending && this.active.ready && this.sent !== this.pending.id) {
      this.sent = this.pending.id; this.active.worker.postMessage(this.pending);
    }
  }
  stop(text = 'Stopped') {
    this.clearTimers(); this.revision++; this.pending = null; this.busy = false;
    this.replace(); this.onMessage({ type: 'stopped', text });
  }
  dispose() { this.disposed = true; this.clearTimers(); this.active.worker.terminate(); this.spare?.worker.terminate(); }
}
if (typeof module !== 'undefined') module.exports = RClient; else globalThis.RClient = RClient;
})();
