(() => {
function parseTraceback(text){
  const matches=[...String(text).matchAll(/main\.R:(\d+)(?::(\d+))?/g)];
  if(!matches.length)return null;
  const frame=matches.at(-1), message=String(text).split('\n').find(line=>/^Error/.test(line))||String(text).split('\n')[0];
  return {line:Number(frame[1]),column:Math.max(0,Number(frame[2]||1)-1),message};
}
if(typeof module!=='undefined')module.exports=parseTraceback;else globalThis.parseTraceback=parseTraceback;
})();
