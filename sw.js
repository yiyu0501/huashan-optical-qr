const CACHE='huashan-final-cleanup-0829-v7';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys()) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch',()=>{});
