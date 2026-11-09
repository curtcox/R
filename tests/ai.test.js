const {test}=require('node:test'),assert=require('node:assert/strict');
const {config,type}=require('../src/fragment-config.mjs');
const {createRAiCheck}=require('../src/ai.mjs');
const {createAi,parseSuite}=require('../vendor/fragment-kit-v0.4.3/src/ai/index.js');
const suite=require('../ai-suite.json');
test('exact R and recovery deployments are idle until consent and start with zero caps',async()=>{
 const cases=[['https://r.hashbin.page/','host'],['https://curtcox.github.io/R/','direct'],['https://evil.example/','paste']];
 for(const [href,mode]of cases){let calls=0;const ai=await createAi({config,type,href,fetchSource:()=>{calls++;throw Error('No eager request');}});assert.equal(ai.connection,mode);assert.equal(calls,0);assert.equal(ai.budget.spent().total,0);ai.destroy();}
});
test('R suite is data only, has 25 cases and cannot change autorun',()=>{
 const t={...type,ai:{paths:['/src','/r/stdin'],checks:{runsAndOutputs(){}}}};
 const parsed=parseSuite(suite,t);assert.equal(parsed.cases.length,25);
 for(const c of parsed.cases){assert.equal(c.reference.good.r.autorun,c.base.r.autorun);assert.equal(c.reference.bad.r.autorun,c.base.r.autorun);}
});
test('R evaluation abort disposes its worker and bounds UTF-8 output',async()=>{
 const prior=globalThis.RClient,previous=globalThis.RSandbox;let disposed=0,callback;
 globalThis.RSandbox={factory:()=>()=>{}};
 globalThis.RClient=class{constructor(options){callback=options.onMessage;}run(){}dispose(){disposed++;}};
 try{
  const controller=new AbortController();const work=createRAiCheck({})({document:{src:'',r:{stdin:''}},signal:controller.signal});controller.abort(new Error('Cancelled test'));await assert.rejects(work,/Cancelled test/);assert.equal(disposed,1);
  const large=createRAiCheck({})({document:{src:'',r:{stdin:''}}});callback({type:'text',stream:'stdout',text:'é'.repeat(32769)});await assert.rejects(large,/64 KiB/);assert.equal(disposed,2);
 }finally{globalThis.RClient=prior;globalThis.RSandbox=previous;}
});
