(function(global){
  'use strict';
  const PREFIX='HY1';
  function utf8ToB64(str){const bytes=new TextEncoder().encode(str);let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
  function b64ToUtf8(b64){const s=atob(b64);const bytes=new Uint8Array(s.length);for(let i=0;i<s.length;i++)bytes[i]=s.charCodeAt(i);return new TextDecoder().decode(bytes)}
  function fnv1a(str){let h=0x811c9dc5;const bytes=new TextEncoder().encode(str);for(const b of bytes){h^=b;h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
  function sessionId(){const a=new Uint32Array(2);crypto.getRandomValues(a);return [...a].map(x=>x.toString(36)).join('').slice(0,12)}
  function makeFrames(file,chunkSize=620){
    const payload=JSON.stringify({name:file.name,mime:file.mime,text:file.text});
    const encoded=utf8ToB64(payload),hash=fnv1a(encoded),session=sessionId();
    const chunks=[];for(let i=0;i<encoded.length;i+=chunkSize)chunks.push(encoded.slice(i,i+chunkSize));
    const total=chunks.length;
    const frames=chunks.map((chunk,index)=>[PREFIX,session,index,total,hash,chunk].join('~'));
    return {session,total,hash,frames,encodedLength:encoded.length};
  }
  function parseFrame(text){
    if(typeof text!=='string'||!text.startsWith(PREFIX+'~'))return null;
    const p=text.split('~');if(p.length!==6)return null;
    const [,session,idxS,totalS,hash,chunk]=p,index=Number(idxS),total=Number(totalS);
    if(!session||!Number.isInteger(index)||!Number.isInteger(total)||index<0||total<1||index>=total||!/^[0-9a-f]{8}$/.test(hash)||!chunk)return null;
    return {session,index,total,hash,chunk};
  }
  class Collector{
    constructor(){this.reset()}
    reset(){this.session=null;this.total=0;this.hash='';this.parts=new Map()}
    add(raw){
      const f=parseFrame(raw);if(!f)return {accepted:false};
      if(this.session!==f.session){this.session=f.session;this.total=f.total;this.hash=f.hash;this.parts.clear()}
      if(f.total!==this.total||f.hash!==this.hash)return {accepted:false};
      this.parts.set(f.index,f.chunk);const received=this.parts.size;
      if(received<this.total)return {accepted:true,received,total:this.total,complete:false};
      let encoded='';for(let i=0;i<this.total;i++){const c=this.parts.get(i);if(!c)return {accepted:true,received,total:this.total,complete:false};encoded+=c}
      if(fnv1a(encoded)!==this.hash)return {accepted:true,received,total:this.total,complete:true,error:'完整性驗證失敗'};
      try{const obj=JSON.parse(b64ToUtf8(encoded));if(!obj||typeof obj.name!=='string'||typeof obj.mime!=='string'||typeof obj.text!=='string')throw new Error('bad payload');return {accepted:true,received,total:this.total,complete:true,result:obj}}catch(e){return {accepted:true,received,total:this.total,complete:true,error:'資料重組失敗'}}
    }
  }
  global.HYQR={makeFrames,parseFrame,Collector,_test:{fnv1a,utf8ToB64,b64ToUtf8}};
})(typeof window!=='undefined'?window:globalThis);
