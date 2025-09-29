// StrideGuide Service Worker - Security Hardened
// Version 2.0 - Allowlist-based caching with deny-by-default fetch

const CACHE_NAME = 'stride-guide-v2';
const CACHE_VERSION = 2;

// Allowlisted paths for caching (deny-by-default security)
const ALLOWED_CACHE_PATHS = [
  // Core app files (GET-only)
  /^\/$/,
  /^\/index\.html$/,
  /^\/manifest\.json$/,
  /^\/sw\.js$/,
  
  // Built assets (Vite patterns) - static resources only
  /^\/assets\/.*\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp)$/,
  
  // Icons and images (specific patterns)
  /^\/icon-\d+\.png$/,
  /^\/favicon\.ico$/,
  /^\/icons\/.*\.(png|svg|ico)$/,
  
  // Audio assets (earcons, TTS) - production ready
  /^\/audio\/.*\.(mp3|wav|ogg)$/,
  /^\/earcons\/.*\.(mp3|wav|ogg)$/,
  
  // ML models and data (offline inference)
  /^\/models\/.*\.(onnx|json|bin)$/,
  /^\/ml\/.*\.(onnx|json|bin)$/,
  
  // Static assets (allowed extensions only)
  /^\/static\/.*\.(png|jpg|jpeg|svg|css|js|woff2?|ttf|eot)$/
];

// Network-first allowlist (for essential runtime requests)
const NETWORK_FIRST_PATHS = [
  /^\/api\//,
  /^\/supabase\//,
  /^https:\/\/.*\.supabase\.co\//,
  /^https:\/\/api\.elevenlabs\.io\//
];

// Install event - precache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Only cache essential files on install
      const essentialUrls = [
        '/',
        '/manifest.json'
      ];
      
      try {
        await cache.addAll(essentialUrls);
        console.log('[SW] Essential assets cached');
      } catch (error) {
        console.warn('[SW] Failed to cache some essential assets:', error);
      }
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const deletePromises = cacheNames
        .filter(name => name !== CACHE_NAME)
        .map(name => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        });
      
      return Promise.all(deletePromises);
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - secure allowlist-based caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    console.log('[SW] Ignoring cross-origin request:', url.href);
    return;
  }
  
  // Only handle GET requests for caching
  if (request.method !== 'GET') {
    console.log('[SW] Ignoring non-GET request:', request.method, url.pathname);
    return;
  }
  
  const pathname = url.pathname;
  
  // Check if path is allowed for caching
  const isAllowedForCache = ALLOWED_CACHE_PATHS.some(pattern => pattern.test(pathname));
  const isNetworkFirst = NETWORK_FIRST_PATHS.some(pattern => pattern.test(pathname));
  
  if (!isAllowedForCache && !isNetworkFirst) {
    console.log('[SW] Path not in allowlist, bypassing cache:', pathname);
    return; // Let browser handle directly
  }
  
  if (isNetworkFirst) {
    // Network-first strategy for API calls
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          // Don't cache failed responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone and cache successful responses
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            // Strip query parameters for cache key
            const cacheKey = new URL(request.url);
            cacheKey.search = '';
            cache.put(cacheKey.href, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // Fallback to cache on network failure
          return caches.match(request, { ignoreSearch: true });
        })
    );
  } else {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          // Try cache first (ignore query parameters)
          const cacheKey = new URL(request.url);
          cacheKey.search = '';
          const cachedResponse = await cache.match(cacheKey.href);
          
          if (cachedResponse) {
            console.log('[SW] Cache hit:', pathname);
            return cachedResponse;
          }
          
          // Fetch from network
          console.log('[SW] Cache miss, fetching:', pathname);
          const networkResponse = await fetch(request, { cache: 'no-store' });
          
          // Only cache successful responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            // Clone and cache response
            const responseToCache = networkResponse.clone();
            await cache.put(cacheKey.href, responseToCache);
            console.log('[SW] Cached new resource:', pathname);
          }
          
          return networkResponse;
          
        } catch (error) {
          console.error('[SW] Fetch failed for:', pathname, error);
          
          // Try to serve from cache as fallback
          const fallbackResponse = await cache.match(request, { ignoreSearch: true });
          if (fallbackResponse) {
            console.log('[SW] Serving fallback from cache:', pathname);
            return fallbackResponse;
          }
          
          // If no cache and network failed, return error
          return new Response('Network error and no cached version available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        }
      })
    );
  }
});

// Handle corrupted cache
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
  
  // Clear cache on severe errors
  caches.delete(CACHE_NAME).then(() => {
    console.log('[SW] Cleared corrupted cache');
  });
});

// Handle app shortcuts and notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  let url = '/';
  
  if (event.action === 'guidance') {
    url = '/?shortcut=guidance';
  } else if (event.action === 'sos') {
    url = '/?shortcut=sos';
  } else if (event.action === 'finder') {
    url = '/?shortcut=finder';
  }
  
  event.waitUntil(
    self.clients.openWindow(url)
  );
});

// Background sync for offline analytics (if implemented)
self.addEventListener('sync', (event) => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(
      // Would sync queued analytics data when online
      console.log('[SW] Background sync triggered for analytics')
    );
  }
});

// Handle push notifications (for emergency alerts)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    // Only show emergency-related notifications
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
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'StrideGuide Alert', options)
      );
    }
  }
});

console.log('[SW] StrideGuide Service Worker v' + CACHE_VERSION + ' loaded');