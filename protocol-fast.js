(function(global){
  'use strict';

  const PREFIX='HK2';

  function fnv1a(str){
    let h=0x811c9dc5;
    for(let i=0;i<str.length;i++){
      h^=str.charCodeAt(i);
      h=Math.imul(h,0x01000193)>>>0;
    }
    return h.toString(16).padStart(8,'0');
  }

  function sessionId(){
    const a=new Uint32Array(2);
    crypto.getRandomValues(a);
    return [...a].map(x=>x.toString(36)).join('').slice(0,12);
  }

  function makeFrames(key,base64Data,chunkSize=850){
    if(key!=='B'&&key!=='W') throw new Error('Invalid card key');
    const hash=fnv1a(base64Data);
    const session=sessionId();
    const chunks=[];
    for(let i=0;i<base64Data.length;i+=chunkSize){
      chunks.push(base64Data.slice(i,i+chunkSize));
    }
    const total=chunks.length;
    const frames=chunks.map((chunk,index)=>
      [PREFIX,session,key,index,total,hash,chunk].join('~')
    );
    return {session,key,total,hash,frames,encodedLength:base64Data.length};
  }

  function parseFrame(raw){
    if(typeof raw!=='string'||!raw.startsWith(PREFIX+'~')) return null;
    const p=raw.split('~');
    if(p.length!==7) return null;
    const [,session,key,idxS,totalS,hash,chunk]=p;
    const index=Number(idxS),total=Number(totalS);
    if(!session||(key!=='B'&&key!=='W')||
       !Number.isInteger(index)||!Number.isInteger(total)||
       index<0||total<1||index>=total||
       !/^[0-9a-f]{8}$/.test(hash)||!chunk) return null;
    return {session,key,index,total,hash,chunk};
  }

  class Collector{
    constructor(){this.reset()}
    reset(){
      this.session=null;
      this.key=null;
      this.total=0;
      this.hash='';
      this.parts=new Map();
    }
    add(raw){
      const f=parseFrame(raw);
      if(!f) return {accepted:false};

      if(this.session!==f.session){
        this.session=f.session;
        this.key=f.key;
        this.total=f.total;
        this.hash=f.hash;
        this.parts.clear();
      }

      if(f.key!==this.key||f.total!==this.total||f.hash!==this.hash){
        return {accepted:false};
      }

      this.parts.set(f.index,f.chunk);
      const received=this.parts.size;

      if(received<this.total){
        return {accepted:true,received,total:this.total,key:this.key,complete:false};
      }

      let joined='';
      for(let i=0;i<this.total;i++){
        const c=this.parts.get(i);
        if(!c) return {accepted:true,received,total:this.total,key:this.key,complete:false};
        joined+=c;
      }

      if(fnv1a(joined)!==this.hash){
        return {accepted:true,received,total:this.total,key:this.key,complete:true,error:'完整性驗證失敗'};
      }

      return {
        accepted:true,
        received,
        total:this.total,
        key:this.key,
        complete:true,
        result:{key:this.key,base64:joined}
      };
    }
  }

  function base64ToBlob(base64Data,mime){
    const binary=atob(base64Data);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }

  global.HKFAST={makeFrames,parseFrame,Collector,base64ToBlob,_test:{fnv1a}};
})(typeof window!=='undefined'?window:globalThis);
