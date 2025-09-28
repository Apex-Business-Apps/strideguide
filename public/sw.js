import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// Precache all build assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache ML models with CacheFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/models/'),
  new CacheFirst({
    cacheName: 'ml-models',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          return `${request.url}?v=1`;
        }
      }
    ]
  })
);

// Cache audio files
registerRoute(
  ({ url }) => url.pathname.startsWith('/audio/'),
  new CacheFirst({
    cacheName: 'audio-assets'
  })
);

// Cache API responses with StaleWhileRevalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-responses'
  })
);

// Handle install prompt
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Handle app shortcuts
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'guidance') {
    event.waitUntil(
      self.clients.openWindow('/?shortcut=guidance')
    );
  } else if (event.action === 'sos') {
    event.waitUntil(
      self.clients.openWindow('/?shortcut=sos')
    );
  }
});