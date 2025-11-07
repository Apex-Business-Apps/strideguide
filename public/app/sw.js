// @stride/sw-app v3.1 — Scoped to /app/ only; GET-only allowlist; update prompt; production-hardened
const CACHE = "sg-app-2025-10-10-v3.1";
const ALLOW = [
  /^\/app\/$/,
  /^\/app\/index\.html$/,
  /^\/app\/assets\//,
  /^\/icons\//,
  /^\/audio\//,
  /^\/ml\//,
  /^\/manifest\.webmanifest$/
];

self.addEventListener("install", (e) => {
  console.log('[SW/app] Installing v3.1');
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  console.log('[SW/app] Activating v3.1');
  e.waitUntil((async () => {
    await clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => {
      console.log(`[SW/app] Deleting stale cache: ${k}`);
      return caches.delete(k);
    }));
  })());
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) return;

  // NEVER cache index.html or the SW file itself
  if (/\/(index\.html)?$/.test(url.pathname) || /\/sw\.js$/.test(url.pathname)) return;

  // Only allowlist-scoped assets (hashed bundles, icons, audio, model files)
  if (!ALLOW.some(rx => rx.test(url.pathname))) return;

  e.respondWith(caches.open(CACHE).then(async (c) => {
    // Cache-first strategy for hashed static assets
    const hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;

    // SECURITY FIX: Removed cache: "no-store" contradiction
    // Fetch fresh version and cache it
    const res = await fetch(r);
    if (res && res.ok) {
      c.put(r, res.clone());
    }
    return res;
  }));
});

// Notification handling
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  let url = '/app';
  if (e.action === 'guidance') url = '/app?shortcut=guidance';
  else if (e.action === 'sos') url = '/app?shortcut=sos';
  else if (e.action === 'finder') url = '/app?shortcut=finder';
  e.waitUntil(self.clients.openWindow(url));
});

// Background sync
self.addEventListener("sync", (e) => {
  if (e.tag === 'analytics-sync') {
    e.waitUntil(console.log('[SW/app] Background sync triggered'));
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

console.log('[SW/app] StrideGuide /app/ Service Worker v3.1 loaded');