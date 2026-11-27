const SHELL_CACHE = 'tq-shell-v1';
const QURAN_CACHE = 'tq-quran-offline-v1';
const AUDIO_CACHE = 'tq-audio-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(['/', '/app', '/favicon.svg', '/manifest.webmanifest']).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Quran JSON data: cache-first from offline cache, fallback network
  if (url.pathname.startsWith('/quran/v1/')) {
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

  // Fonts: cache-first
  if (url.pathname.startsWith('/fonts/')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
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
