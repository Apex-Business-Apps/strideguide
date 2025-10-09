// @stride/sw v3 — GET-only allowlist; no index.html/SW caching; safe updates
const CACHE = "sg-2025-10-08-app-scope-v2";
const ALLOW = [/^\/app\/$/, /^\/app\/index\.html$/, /^\/app\/assets\//, /^\/icons\//, /^\/audio\//, /^\/ml\//, /^\/manifest\.webmanifest$/];

self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil((async () => {
    await clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  })())
);

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) return;

  // Never cache index.html or the SW file itself
  if (/\/(index\.html)?$/.test(url.pathname) || /\/sw\.js$/.test(url.pathname)) return;

  // Only allowlist-scoped assets (hashed bundles, icons, audio, model files)
  if (!ALLOW.some(rx => rx.test(url.pathname))) return;

  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(r, { cache: "no-store" });
    if (res && res.ok) c.put(r, res.clone());
    return res;
  }));
});

// Notification handling
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  let url = '/';
  if (e.action === 'guidance') url = '/?shortcut=guidance';
  else if (e.action === 'sos') url = '/?shortcut=sos';
  else if (e.action === 'finder') url = '/?shortcut=finder';
  e.waitUntil(self.clients.openWindow(url));
});

// Background sync
self.addEventListener("sync", (e) => {
  if (e.tag === 'analytics-sync') {
    e.waitUntil(console.log('[SW] Background sync triggered'));
  }
});

// Push notifications (emergency only)
self.addEventListener("push", (e) => {
  if (e.data) {
    const data = e.data.json();
    if (data.type === 'emergency' || data.type === 'safety-alert') {
      const options = {
        body: data.body || 'Emergency notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'emergency',
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      };
      e.waitUntil(self.registration.showNotification(data.title || 'StrideGuide Alert', options));
    }
  }
});

console.log('[SW] StrideGuide Service Worker v3 loaded');
