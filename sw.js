const CACHE='huashan-optical-qr-final-v4';

const CORE=[
  './',
  './index.html',
  './sender.html',
  './receiver.html',
  './styles.css',
  './protocol.js',
  './manifest.webmanifest',
  './badge-a.svg',
  './badge-b.svg'
];

const EXTERNAL=[
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);

    for(const url of CORE){
      try{
        const response=await fetch(url,{cache:'reload'});
        if(response.ok) await cache.put(url,response);
      }catch(_){}
    }

    for(const url of EXTERNAL){
      try{
        const response=await fetch(url,{mode:'no-cors'});
        await cache.put(url,response);
      }catch(_){}
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys()){
      if(key!==CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  event.respondWith((async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    if(cached) return cached;

    try{
      const response=await fetch(event.request);
      if(response && ['basic','cors','opaque'].includes(response.type)){
        const cache=await caches.open(CACHE);
        cache.put(event.request,response.clone()).catch(()=>{});
      }
      return response;
    }catch(error){
      if(event.request.mode==='navigate'){
        return caches.match('./index.html');
      }
      throw error;
    }
  })());
});