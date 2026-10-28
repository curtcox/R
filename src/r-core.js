/** Shared R orchestration for the opaque worker, Node tests and gallery renderer. */
(() => {
const WEBR_URL = 'https://cdn.jsdelivr.net/npm/webr@0.6.0/dist/';
const PACKAGE_URL = 'https://repo.r-wasm.org/bin/emscripten/contrib/4.6/';
class OutputBuffer {
  constructor(emit, { maxBytes = 1024 * 1024, maxLines = 20000, now = () => Date.now() } = {}) {
    Object.assign(this, { emit, maxBytes, maxLines, now });
    this.bytes = this.lines = 0; this.pending = ''; this.last = now();
  }
  push(item) {
    if (item.type === 'flush') { this.flush(); return; }
    if (item.type !== 'text') { this.flush(); this.emit(item); return; }
    if (this.truncated) return;
    const remainingLines = this.maxLines - this.lines;
    let text = String(item.text).split('\n').slice(0, remainingLines + 1).join('\n');
    const bytes = new TextEncoder().encode(text);
    if (bytes.length > this.maxBytes - this.bytes) text = new TextDecoder().decode(bytes.slice(0, Math.max(0, this.maxBytes - this.bytes)));
    if (this.stream !== item.stream) this.flush();
    this.stream = item.stream; this.pending += text;
    this.bytes += new TextEncoder().encode(text).length; this.lines += (text.match(/\n/g) || []).length;
    if (text.length !== String(item.text).length || this.bytes >= this.maxBytes || this.lines >= this.maxLines) {
      this.truncated = true; this.pending += '\n… output truncated\n';
    }
    if (this.pending.length >= 8192 || this.now() - this.last >= 50 || this.truncated || (!this.sentText && this.pending.includes('\n'))) this.flush();
  }
  flush() {
    if (this.pending) this.emit({ type: 'text', text: this.pending, stream: this.stream || 'stdout' });
    if (this.pending) this.sentText = true;
    this.pending = ''; this.last = this.now();
  }
}
function harden(scope = globalThis) {
  // Remove inherited getters too; shadowing alone leaves prototype getter bypasses.
  // Nested workers would create a fresh realm with the storage APIs restored.
  for (const key of ['caches', 'indexedDB', 'importScripts', 'Worker', 'SharedWorker']) {
    for (let prototype = Object.getPrototypeOf(scope); prototype; prototype = Object.getPrototypeOf(prototype)) {
      if (Object.getOwnPropertyDescriptor(prototype, key)?.configurable) delete prototype[key];
    }
    Object.defineProperty(scope, key, { value: undefined, configurable: false, writable: false });
  }
}
// Strip strings/comments while retaining quoted arguments to library()/require().
function scanPackages(source) {
  const tokens = String(source).match(/#[^\n]*|(?:r|R)(["'])\([^]*?\)\1|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|[A-Za-z.][\w.]*|:::|::|[^\s]/g) || [];
  const packages = new Set();
  for (let i=0;i<tokens.length;i++) {
    const token=tokens[i];
    if (/^(library|require|requireNamespace)$/.test(token) && tokens[i+1]==='(') {
      const name=tokens[i+2]?.replace(/^['"]|['"]$/g,'');
      if (/^[A-Za-z][\w.]*$/.test(name || '')) packages.add(name);
    } else if (/^[A-Za-z][\w.]*$/.test(token) && /^:::$|^::$/.test(tokens[i+1] || '')) packages.add(token);
  }
  return [...packages].sort();
}
const quote = value => JSON.stringify(String(value)).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
class RCore {
  constructor(engine, emit) {this.engine=engine;this.emit=emit;}
  async install(modules) {
    for (const name of ['runtime','t256']) if (modules[name]) {
      await this.engine.writeFile('/home/web_user/'+name+'.R',new TextEncoder().encode(modules[name]));
      await this.engine.evaluate('source('+quote('/home/web_user/'+name+'.R')+', local=globalenv())');
    }
  }
  output(item) {if(this.buffer)this.buffer.push(item);}
  async run({id,source,stdin='',mode='manual'}) {
    const send = item => this.emit({...item,id});
    this.buffer=new OutputBuffer(send);
    let error,start;
    try {
      await this.engine.evaluate('get(".online_prepare",as.environment("online:runtime"))('+quote(stdin)+')');
      await this.engine.prepare?.(source,text=>send({type:'status',text}));
      const packages=scanPackages(source);
      for(const name of packages) {
        const present=await this.engine.evaluate('base::requireNamespace('+quote(name)+', quietly=TRUE)','boolean');
        if(!present) {
          send({type:'status',text:'Installing '+name+' and dependencies…'});
          await this.engine.installPackages([name]);
        }
      }
      await this.engine.writeFile('/home/web_user/main.R',new TextEncoder().encode(source));
      send({type:'running'});start=performance.now();
      error=await this.engine.evaluate('get(".online_execute",as.environment("online:runtime"))()', 'string');
      const completion=await this.engine.evaluate('paste(unique(unlist(lapply(search(), function(x) ls(as.environment(x))))),collapse="\\n")','string');
      send({type:'completions',names:completion.split('\n')});
    }catch(caught){error=String(caught.message||caught);this.output({type:'text',stream:'stderr',text:error+'\n'});}
    finally {this.buffer.flush();this.buffer=null;}
    const result={type:'done',id,ok:!error,error,ms:start===undefined?0:performance.now()-start};send(result);return result;
  }
}
const api={WEBR_URL,PACKAGE_URL,RCore,OutputBuffer,harden,scanPackages};
if(typeof module!=='undefined')module.exports=api;else Object.assign(globalThis,api);
})();
