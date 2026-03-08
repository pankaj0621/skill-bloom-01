const CACHE_NAME = 'skilltracker-v3';
const OFFLINE_URL = '/offline.html';
const API_CACHE = 'skilltracker-api-v1';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keepCaches.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Navigation: network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // JS/CSS bundles: network-first (prevents stale bundles)
  if (url.endsWith('.js') || url.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || new Response('', { status: 408 })))
    );
    return;
  }

  // Supabase API: stale-while-revalidate for GET requests
  if (url.includes('supabase.co') && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached || new Response('{"error":"offline"}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }));

        // Return cached immediately if available, update in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets (images, fonts, webp): cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (
          response.status === 200 &&
          (url.endsWith('.png') || url.endsWith('.svg') || url.endsWith('.woff2') ||
           url.endsWith('.webp') || url.endsWith('.jpg') || url.endsWith('.jpeg') ||
           url.endsWith('.ico'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', { status: 408 }));
    })
  );
});
