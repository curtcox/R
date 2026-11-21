const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const sizes=require('../scripts/check-file-sizes.mjs');
const KiB=1024,MiB=1024*KiB,ZERO='0'.repeat(40);

test('limits are chosen by path and type',()=>{
 const limit=file=>[sizes.ruleFor(file).name,sizes.ruleFor(file).limit];
 assert.deepEqual(limit('package-lock.json'),['lockfile',MiB]);
 assert.deepEqual(limit('ace/ace.js'),['vendored code',512*KiB]);
 assert.deepEqual(limit('svg-pan-zoom.min.js'),['vendored code',512*KiB]);
 assert.deepEqual(limit('vendor/x/a.wasm'),['wasm',4*MiB]);
 assert.deepEqual(limit('vendor/x/README.md'),['markup',128*KiB]);
 assert.deepEqual(limit('src/app.js'),['code',128*KiB]);
 assert.deepEqual(limit('src/r/runtime.R'),['code',128*KiB]);
 assert.deepEqual(limit('ai-suite.json'),['data',128*KiB]);
 assert.deepEqual(limit('gallery/previews/a.svg'),['svg',128*KiB]);
 assert.deepEqual(limit('icons/ICON.PNG'),['image',256*KiB]);
 assert.deepEqual(limit('LICENSE-x'),['other',512*KiB]);
});

test('the ratchet blocks new and growing files and demands tightening',()=>{
 const baseline={files:{'a.wasm':{bytes:5*MiB},'b.wasm':{bytes:6*MiB},'c.wasm':{bytes:5*MiB},'gone.wasm':{bytes:5*MiB}}};
 const files=[{path:'a.wasm',size:5*MiB},{path:'b.wasm',size:6*MiB+1},{path:'c.wasm',size:MiB},{path:'new.svg',size:200*KiB},{path:'ok.svg',size:100*KiB}];
 const problems=sizes.evaluate(files,baseline,{stale:true}).join('\n');
 assert.match(problems,/b\.wasm: grew/);
 assert.match(problems,/c\.wasm: now .*within the wasm limit/);
 assert.match(problems,/new\.svg: 200\.0 KiB exceeds the 128\.0 KiB svg limit/);
 assert.match(problems,/gone\.wasm: no longer exists/);
 assert.doesNotMatch(problems,/a\.wasm|ok\.svg/);
 assert.match(sizes.evaluate([{path:'a.wasm',size:4*MiB+1}],baseline,{stale:true}).join(),/shrank/);
 assert.deepEqual(sizes.evaluate([{path:'a.wasm',size:4*MiB+1}],baseline),[]);
 assert.match(sizes.evaluate([{path:'huge.bin',size:sizes.CEILING+1}],{files:{'huge.bin':{bytes:sizes.CEILING+1}}}).join(),/ceiling/);
});

test('tightening only shrinks or drops entries and keeps notes',()=>{
 const baseline={about:'x',files:{'a.wasm':{bytes:6*MiB,note:'why'},'b.wasm':{bytes:5*MiB},'c.wasm':{bytes:5*MiB},'d.wasm':{bytes:5*MiB}}};
 const {baseline:next,changes}=sizes.tighten([{path:'a.wasm',size:5*MiB},{path:'b.wasm',size:MiB},{path:'d.wasm',size:7*MiB}],baseline);
 assert.deepEqual(next,{about:'x',files:{'a.wasm':{bytes:5*MiB,note:'why'},'d.wasm':{bytes:5*MiB}}});
 assert.equal(changes.length,3);
});

function repo(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ronline-sizes-')),remote=path.join(dir,'remote.git'),work=path.join(dir,'work');
 const git=(...args)=>execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false',...args],{cwd:work,encoding:'utf8'}).trim();
 execFileSync('git',['init','-q','--bare',remote]);fs.mkdirSync(work);git('init','-q','-b','main');git('remote','add','origin',remote);
 const write=(file,size)=>{fs.mkdirSync(path.dirname(path.join(work,file)),{recursive:true});fs.writeFileSync(path.join(work,file),typeof size==='string'?size:'x'.repeat(size));};
 const commit=message=>{git('add','-A');git('commit','-q','--allow-empty','-m',message);return git('rev-parse','HEAD');};
 return {dir,work,git,write,commit};
}

test('pre-push checks every pushed commit, not just the tip',t=>{
 const r=repo();t.after(()=>fs.rmSync(r.dir,{recursive:true,force:true}));
 r.write('src/a.js',KiB);const base=r.commit('base');r.git('push','-q','origin','main');
 assert.deepEqual(sizes.prePush(`refs/heads/main ${base} refs/heads/main ${base}\n`,r.work),[]);
 r.write('src/big.js',200*KiB);r.commit('add big');fs.rmSync(path.join(r.work,'src/big.js'));const tip=r.commit('remove big');
 const problems=sizes.prePush(`refs/heads/main ${tip} refs/heads/main ${base}\n`,r.work);
 assert.equal(problems.length,1);assert.match(problems[0],/src\/big\.js: 200\.0 KiB exceeds the 128\.0 KiB code limit/);
 assert.equal(sizes.prePush(`refs/heads/topic ${tip} refs/heads/topic ${ZERO}\n`,r.work).length,1);
 assert.deepEqual(sizes.prePush(`(delete) ${ZERO} refs/heads/old ${base}\n`,r.work),[]);
});

test('pre-push honours the baseline committed at the pushed tip',t=>{
 const r=repo();t.after(()=>fs.rmSync(r.dir,{recursive:true,force:true}));
 r.write('README.md',10);const base=r.commit('base');r.git('push','-q','origin','main');
 r.write('a.wasm',5*MiB);r.write(sizes.BASELINE,JSON.stringify({files:{'a.wasm':{bytes:5*MiB}}}));const ok=r.commit('accept wasm');
 assert.deepEqual(sizes.prePush(`refs/heads/main ${ok} refs/heads/main ${base}\n`,r.work),[]);
 r.write('a.wasm',5*MiB+1);const grown=r.commit('grow wasm');
 assert.match(sizes.prePush(`refs/heads/main ${grown} refs/heads/main ${base}\n`,r.work).join(),/a\.wasm: grew/);
 assert.deepEqual(sizes.workingTree(r.work).find(file=>file.path==='a.wasm'),{path:'a.wasm',size:5*MiB+1});
});

test('hook install keeps a developer-chosen hooks path',t=>{
 const r=repo();t.after(()=>fs.rmSync(r.dir,{recursive:true,force:true}));
 assert.match(sizes.installHook(r.work),/skipped/);
 fs.mkdirSync(path.join(r.work,sizes.HOOKS));
 assert.match(sizes.installHook(r.work),/core\.hooksPath = \.githooks/);assert.equal(r.git('config','core.hooksPath'),'.githooks');
 r.git('config','core.hooksPath','custom');assert.match(sizes.installHook(r.work),/already custom/);assert.equal(r.git('config','core.hooksPath'),'custom');
});
