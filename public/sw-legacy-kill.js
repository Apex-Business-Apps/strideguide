// No-op service worker that self-unregisters
// Deploy this at /sw.js if you ever shipped a root SW to kill legacy registrations
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { 
      await self.registration.unregister(); 
    } catch(_) {}
  })());
});

console.log('[SW] Legacy service worker self-unregistered');
