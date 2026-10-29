/* Verified synchronous 256t transport for webR's PostMessage channel.
   SHA-512 is synchronous because R cannot await crypto.subtle on this channel. */
(() => {
  const cache=new Map();let servers=['https://256t.us/','https://256t.org/'];
  const encode=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
  const decode=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  function cid(text){const bytes=new TextEncoder().encode(text),size=new Uint8Array(6);let n=bytes.length;for(let i=5;i>=0;i--){size[i]=n%256;n=Math.floor(n/256);}return encode(size)+encode(bytes.length<=64?bytes:new Uint8Array(sha512.arrayBuffer(bytes)));}
  function length(value){if(!/^[A-Za-z0-9_-]{8,94}$/.test(value))throw Error('Invalid 256t CID');const size=decode(value.slice(0,8)).reduce((n,b)=>n*256+b,0);if(size>5*1024*1024)throw Error('256t document exceeds 5 MiB');if(value.length!==8+(size<=64?Math.ceil(size*4/3):86)||encode(decode(value.slice(8)))!==value.slice(8))throw Error('Invalid 256t CID');return size;}
  function text(value){
    const size=length(value);if(cache.has(value))return cache.get(value);
    if(size<=64){const result=new TextDecoder('utf-8',{fatal:true}).decode(decode(value.slice(8)));cache.set(value,result);return result;}
    let last;
    for(const base of servers){try{
      const xhr=new XMLHttpRequest();xhr.open('GET',base+value,false);xhr.responseType='arraybuffer';xhr.send(null);
      if(xhr.status!==200)throw Error('256t fetch failed (HTTP '+xhr.status+')');
      const bytes=new Uint8Array(xhr.response);if(bytes.length!==size)throw Error('256t content does not match its CID');
      const result=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(cid(result)!==value)throw Error('256t content does not match its CID');
      cache.set(value,result);globalThis.Module?.webr?.channel.write({type:'online-output',data:{type:'t256-cache',cid:value,text:result}});return result;
    }catch(error){last=error;}}
    throw last||Error('256t content is unavailable');
  }
  function source(value){const body=text(value);let doc;try{doc=JSON.parse(body);}catch{}
    if(doc?.format==='hashbin-diagram'){if(doc.version!==1||doc.type!=='r'||typeof doc.src!=='string')throw Error('Saved document is not a supported R Online program');return doc.src;}return body;
  }
  globalThis.T256Bridge=Object.freeze({text,source,cid,seed(values){for(const [key,value]of Object.entries(values||{}))if(typeof value==='string'&&cid(value)===key)cache.set(key,value);},setServers(values){servers=values.slice();cache.clear();}});
})();
