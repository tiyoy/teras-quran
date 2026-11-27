const SHELL_CACHE = 'tq-shell-v2';
const QURAN_CACHE = 'tq-quran-offline-v1';
const AUDIO_CACHE = 'tq-audio-v1';

const PRECACHE_URLS = [
  '/',
  '/app',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, QURAN_CACHE, AUDIO_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Quran JSON data: cache-first from offline cache, fallback network
  if (url.origin === self.location.origin && url.pathname.startsWith('/quran/v1/')) {
    event.respondWith(
      caches.open(QURAN_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // Audio CDN: check offline audio cache first
  if (url.hostname === 'cdn.islamic.network' || url.hostname === 'cdn.alquran.cloud') {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        return hit || fetch(request);
      })
    );
    return;
  }

  // Same-origin static assets (JS/CSS bundles, fonts, icons): cache-first
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_astro/') ||
      url.pathname.startsWith('/fonts/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/favicon.svg' ||
      url.pathname === '/manifest.webmanifest')
  ) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // Same-origin page navigations: network-first with offline cache fallback
  if (url.origin === self.location.origin && request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match('/app')) ||
            (await cache.match('/')) ||
            new Response('Offline — buka kembali saat terhubung internet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
