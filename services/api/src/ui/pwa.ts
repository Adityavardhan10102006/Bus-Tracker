/**
 * VJIT College Bus Tracker — Progressive Web App (PWA) Assets
 * Specification: UI-SPEC-1.0, Offline-First Architecture
 * Enforces strict caching of static assets only; sensitive APIs are never cached.
 */

export function getManifestJson(): string {
  return JSON.stringify(
    {
      name: 'VJIT College Bus Tracker',
      short_name: 'VJIT Tracker',
      description: 'Vidya Jyothi Institute of Technology Real-Time Transit Intelligence & Student Commute',
      start_url: '/app',
      scope: '/',
      display: 'standalone',
      background_color: '#0F172A',
      theme_color: '#103754',
      orientation: 'portrait-primary',
      categories: ['education', 'navigation', 'transit'],
      icons: [
        {
          src: '/assets/vjit-logo.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/assets/vjit-logo.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    null,
    2,
  );
}

export function getServiceWorkerJs(): string {
  return `/**
 * VJIT College Bus Tracker — Service Worker
 * Scoped exclusively to static app shell assets.
 * Live telemetry and authenticated user credentials are strictly NOT cached.
 */

const CACHE_NAME = 'vjit-tracker-shell-v1';
const STATIC_ASSETS = [
  '/app',
  '/assets/vjit-logo.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Remote CDNs may be offline during installation; continue gracefully
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // SECURITY & HONESTY RULE:
  // Never intercept or cache sensitive/dynamic API endpoints or mutation operations
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first strategy for static application assets with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname === '/app' ||
              url.pathname.startsWith('/assets/') ||
              url.hostname.includes('fonts.googleapis.com') ||
              url.hostname.includes('unpkg.com'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and navigating to page, provide cached app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/app');
          }
          return new Response('Network offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
`;
}
