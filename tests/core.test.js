const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {scanPackages,OutputBuffer}=require('../src/r-core.js');
let runtime,events=[],id=0;
before(async()=>{runtime=await(await import('../src/r-node.mjs')).createNodeCore(item=>events.push(item));});
after(async()=>{await runtime?.close();});
async function run(source,stdin='') {events=[];const result=await runtime.core.run({id:++id,source,stdin});return {...result,events:[...events],text:events.filter(e=>e.type==='text').map(e=>e.text).join('')};}
test('R output autoprints and warnings follow ordered output',async()=>{
 const r=await run('cat("before\\n")\n1+1\nwarning("careful")\ncat("after\\n")');
 assert.ok(r.ok,r.error);assert.match(r.text,/before\n\[1\] 2\nafter\nWarning message:\ncareful/);
});
test('runs clear globals, options, seed, working directory and devices',async()=>{
 await run('x <- 42; options(online.test=99); set.seed(12); setwd("/tmp")');
 const r=await run('cat(exists("x"),is.null(getOption("online.test")),exists(".Random.seed"),getwd())');
 assert.ok(r.ok,r.error);assert.match(r.text,/FALSE TRUE FALSE \/home\/web_user/);
});
test('all stdin readers consume input and echo lines',async()=>{
 const r=await run('a<-readline("Name: "); b<-readLines(file("stdin"),n=1); c<-readLines(stdin(),n=1); d<-scan("stdin",quiet=TRUE); print(list(a,b,c,d))','Ada\nsecond\nthird\n1 2 3\n');
 assert.ok(r.ok,r.error);assert.match(r.text,/Name: Ada\nsecond\nthird\n1 2 3/);assert.match(r.text,/1 2 3/);
 const exhausted=await run('readline(); readline()');assert.ok(exhausted.ok,exhausted.error);assert.equal((exhausted.text.match(/Program input is empty/g)||[]).length,1);
});
test('errors preserve earlier output and map main.R lines',async()=>{
 const r=await run('cat("before\\n")\nf <- function() stop("broken")\nf()');
 assert.equal(r.ok,false);assert.match(r.error,/broken/);assert.match(r.error,/main.R:3/);assert.match(r.text,/before/);
 const syntax=await run('x <- 1\ny <- )');assert.equal(syntax.ok,false);assert.match(syntax.error,/main.R:2/);
});
test('Cairo captures ordered pages as SVG and 2x PNG',async()=>{
 const r=await run('plot(1:3)\ncat("between\\n")\nplot(3:1)');assert.ok(r.ok,r.error);
 const figures=r.events.filter(e=>e.type==='figure');assert.equal(figures.length,2);assert.match(figures[0].svg,/<svg/);
 const png=Buffer.from(figures[0].png,'base64');assert.equal(png.readUInt32BE(16),1344);assert.equal(png.readUInt32BE(20),960);
 assert.ok(r.events.indexOf(figures[0])<r.events.findIndex(e=>e.type==='text'&&e.text.includes('between')));
});
test('rich helpers send data rather than executable messages',async()=>{
 const r=await run('display_html("<b>hi</b>"); display_markdown("# hi"); display_svg("<svg/>")');assert.ok(r.ok,r.error);
 assert.deepEqual(r.events.filter(e=>['html','markdown','svg'].includes(e.type)).map(e=>e.type),['html','markdown','svg']);
});
test('scanner ignores strings, comments and raw strings',()=>{
 assert.deepEqual(scanPackages('library(ggplot2)\nrequire("dplyr")\nrequireNamespace("jsonlite")\ntidyr::pivot_longer(x) # fake::fn()\nx <- "bad::fn()"\nx <- r"(false::fn())"'),['dplyr','ggplot2','jsonlite','tidyr']);
});
test('output cap preserves rich output and flush ordering',()=>{
 const out=[];const b=new OutputBuffer(x=>out.push(x),{maxBytes:5});b.push({type:'text',text:'abcdefgh'});b.push({type:'html',data:'<b>x</b>'});b.flush();
 assert.match(out[0].text,/abcde\n… output truncated/);assert.equal(out[1].type,'html');
});
test('R saved-function AST validation and function/demo forms',async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'r/t256.R'),'utf8');const r=await run(source);assert.ok(r.ok,r.error);assert.match(r.text,/256t R tests passed/);
});
test('base help renders through the rich HTML output protocol',async()=>{
 const r=await run('?mean\nhelp("sum")');assert.ok(r.ok,r.error);assert.equal(r.events.filter(e=>e.type==='html').length,2);assert.match(r.events.find(e=>e.type==='html').data,/Arithmetic Mean/);
});

test('Program input preserves blank lines and each run rewinds the shared connection',async()=>{
 const r=await run('print(readLines("stdin"))','first\n\nlast\n\n');assert.ok(r.ok,r.error);assert.match(r.text,/"first" ""\s+"last"\s+""/);
 const again=await run('cat(readline())','again\n');assert.equal(again.text,'again\nagain');
});

test('scan nmax and nlines retain the same unread input as a base text connection',async()=>{
 for(const options of ['nmax=1','nlines=1']){
  const source='expected <- textConnection(c("1 2", "3 4", "last")); base::scan(expected, '+options+', quiet=TRUE); remainder <- base::readLines(expected); close(expected); scan("stdin", '+options+', quiet=TRUE); stopifnot(identical(readLines("stdin"),remainder));cat("preserved")';
  const r=await run(source,'1 2\n3 4\nlast\n');assert.ok(r.ok,r.error);assert.match(r.text,/preserved/);
 }
});

test('plot dimensions, multi-panel pages, and explicit device closure preserve captures',async()=>{
 const r=await run('options(online.plot.width=4,online.plot.height=3);par(mfrow=c(1,2));plot(1:3);plot(3:1);dev.off()');assert.ok(r.ok,r.error);const figures=r.events.filter(e=>e.type==='figure');assert.equal(figures.length,1);const png=Buffer.from(figures[0].png,'base64');assert.equal(png.readUInt32BE(16),768);assert.equal(png.readUInt32BE(20),576);
});
