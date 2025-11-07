// @stride/sw v4 — GET-only allowlist; TTL cache expiration; safe updates
const CACHE = "sg-2025-11-07-app-scope-v4";
const ALLOW = [/^\/app\/$/, /^\/app\/index\.html$/, /^\/app\/assets\//, /^\/icons\//, /^\/audio\//, /^\/ml\//, /^\/manifest\.webmanifest$/];

// Cache TTL (Time To Live) in milliseconds
const CACHE_TTL = {
  assets: 7 * 24 * 60 * 60 * 1000, // 7 days for hashed assets
  icons: 30 * 24 * 60 * 60 * 1000, // 30 days for icons
  audio: 14 * 24 * 60 * 60 * 1000, // 14 days for audio files
  ml: 14 * 24 * 60 * 60 * 1000, // 14 days for ML models
  default: 24 * 60 * 60 * 1000, // 1 day for everything else
};

// Get TTL for a URL
function getTTL(url) {
  if (/\/app\/assets\//.test(url)) return CACHE_TTL.assets;
  if (/\/icons\//.test(url)) return CACHE_TTL.icons;
  if (/\/audio\//.test(url)) return CACHE_TTL.audio;
  if (/\/ml\//.test(url)) return CACHE_TTL.ml;
  return CACHE_TTL.default;
}

// Check if cached response is still fresh
function isCacheFresh(cachedResponse, url) {
  if (!cachedResponse) return false;

  const cachedDate = cachedResponse.headers.get('sw-cached-at');
  if (!cachedDate) return false; // No cache timestamp

  const cachedTime = new Date(cachedDate).getTime();
  const now = Date.now();
  const ttl = getTTL(url);

  return (now - cachedTime) < ttl;
}

// Conditional skipWaiting - only skip if no clients or user approves
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    // Check if there are any clients
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    if (clients.length === 0) {
      // No clients - safe to skip waiting immediately
      console.log('[SW] No active clients, skipping waiting immediately');
      await self.skipWaiting();
    } else {
      // Clients exist - wait for user approval or page reload
      console.log('[SW] Active clients detected, waiting for user approval');
      // Message all clients about update
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_UPDATE_AVAILABLE',
          payload: {
            version: CACHE,
            requiresReload: true
          }
        });
      });
    }
  })());
});
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
    // Cache-first strategy with TTL validation
    const cached = await c.match(r, { ignoreSearch: true });

    // Check if cache is still fresh
    if (cached && isCacheFresh(cached, url.pathname)) {
      console.log('[SW] Cache hit (fresh):', url.pathname);
      return cached;
    }

    // Cache miss or stale - fetch fresh version
    try {
      const res = await fetch(r);
      if (res && res.ok) {
        // Clone response and add cache timestamp header
        const headers = new Headers(res.headers);
        headers.set('sw-cached-at', new Date().toISOString());

        const responseToCache = new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: headers
        });

        // Cache the response with timestamp
        c.put(r, responseToCache.clone());
        console.log('[SW] Cached fresh:', url.pathname);

        return responseToCache;
      }
      return res;
    } catch (err) {
      // Network failure - return stale cache if available
      if (cached) {
        console.log('[SW] Network failed, returning stale cache:', url.pathname);
        return cached;
      }
      throw err;
    }
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

// Handle messages from clients (e.g., update approval)
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    console.log('[SW] User approved update, skipping waiting');
    self.skipWaiting();
  }
});

console.log('[SW] StrideGuide Service Worker v4 loaded with TTL cache expiration');
