// StrideGuide Service Worker - Security Hardened & Performance Optimized
// Version 3.0 - Allowlist-based caching with deny-by-default fetch + Stale-While-Revalidate

const CACHE_NAME = 'stride-guide-v3';
const CACHE_VERSION = 3;
const MAX_CACHE_SIZE = 100; // Maximum cached items
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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
  
  // CRITICAL: Never cache Supabase auth requests - bypass SW entirely
  if (url.hostname.includes('supabase.co')) {
    return; // Let browser handle directly - no SW interference
  }
  
  // Only handle same-origin requests for everything else
  if (url.origin !== self.location.origin) {
    return; // Let browser handle directly
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
    // Stale-While-Revalidate strategy for static assets (performance optimized)
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          // Try cache first (ignore query parameters)
          const cacheKey = new URL(request.url);
          cacheKey.search = '';
          const cachedResponse = await cache.match(cacheKey.href);
          
          // Check if cached response is expired
          const fetchPromise = fetch(request, { cache: 'no-store' })
            .then(async (networkResponse) => {
              // Only cache successful responses
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                // Clone and cache response
                const responseToCache = networkResponse.clone();
                
                // Add timestamp header for expiry tracking
                const headers = new Headers(responseToCache.headers);
                headers.append('sw-cache-time', Date.now().toString());
                
                const responseWithTimestamp = new Response(responseToCache.body, {
                  status: responseToCache.status,
                  statusText: responseToCache.statusText,
                  headers: headers
                });
                
                await cache.put(cacheKey.href, responseWithTimestamp);
                
                // Enforce cache size limit
                const keys = await cache.keys();
                if (keys.length > MAX_CACHE_SIZE) {
                  await cache.delete(keys[0]);
                }
              }
              
              return networkResponse;
            })
            .catch((error) => {
              console.error('[SW] Network fetch failed:', pathname, error);
              return null;
            });
          
          if (cachedResponse) {
            // Check cache age
            const cacheTime = cachedResponse.headers.get('sw-cache-time');
            const age = cacheTime ? Date.now() - parseInt(cacheTime) : Infinity;
            
            if (age < CACHE_EXPIRY_MS) {
              // Return cached response immediately, update in background
              console.log('[SW] Cache hit (stale-while-revalidate):', pathname);
              fetchPromise; // Update cache in background
              return cachedResponse;
            } else {
              console.log('[SW] Cache expired, fetching fresh:', pathname);
            }
          }
          
          // Wait for network response if no valid cache
          const networkResponse = await fetchPromise;
          if (networkResponse) {
            return networkResponse;
          }
          
          // Fallback to stale cache if network failed
          if (cachedResponse) {
            console.log('[SW] Serving stale cache (network failed):', pathname);
            return cachedResponse;
          }
          
          // If no cache and network failed, return error
          return new Response('Network error and no cached version available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
          
        } catch (error) {
          console.error('[SW] Cache error:', pathname, error);
          
          // Try direct fetch as last resort
          try {
            return await fetch(request);
          } catch (fetchError) {
            return new Response('Service temporarily unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          }
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