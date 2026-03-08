const CACHE_NAME = 'skilltracker-v4';
const OFFLINE_URL = '/offline.html';
const API_CACHE = 'skilltracker-api-v2';
const IMG_CACHE = 'skilltracker-img-v1';

const MAX_API_CACHE = 100;
const MAX_IMG_CACHE = 200;
const API_CACHE_TTL = 1000 * 60 * 5; // 5 min TTL for API cache

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Handle skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, API_CACHE, IMG_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keepCaches.includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Trim cache to max entries (LRU-ish: delete oldest)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!url.startsWith('http')) return;

  // Navigation: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the navigation response for faster subsequent loads
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // JS/CSS bundles with content-hash: cache-first (hashed filenames = immutable)
  if ((url.endsWith('.js') || url.endsWith('.css')) && url.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Non-hashed JS/CSS: network-first
  if (url.endsWith('.js') || url.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || new Response('', { status: 408 })))
    );
    return;
  }

  // Supabase API: stale-while-revalidate for GET requests
  if (url.includes('supabase.co') && request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(request, clone);
                trimCache(API_CACHE, MAX_API_CACHE);
              });
            }
            return response;
          })
          .catch(() => cached || new Response('{"error":"offline"}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }));

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Images & fonts: cache-first with size limit
  const isStaticAsset = /\.(png|svg|woff2?|webp|jpe?g|ico|gif|avif|ttf|eot)(\?.*)?$/i.test(url);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(IMG_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(IMG_CACHE, MAX_IMG_CACHE);
            });
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((c) => c || new Response('', { status: 408 })))
  );
});
