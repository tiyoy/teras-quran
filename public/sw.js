const SHELL_CACHE = 'tq-shell-v5';
const QURAN_CACHE = 'tq-quran-offline-v1';
const AUDIO_CACHE = 'tq-audio-v1';

const FALLBACK_SHELL_PAGES = [
  '/',
  '/panduan',
  '/tentang',
  '/privacy-policy',
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/verifikasi',
  '/app',
  '/app/surah',
  '/app/juz',
  '/app/halaman',
  '/app/manzil',
  '/app/ruku',
  '/app/sajda',
  '/app/tajwid',
  '/app/cari',
  '/app/bacaanku',
  '/app/favorit',
  '/app/koleksi',
  '/app/catatan',
  '/app/surah-pilihan',
  '/app/progres',
  '/app/hafalan',
  '/app/sambung-ayat',
  '/app/khataman',
  '/app/khataman/grup',
  '/app/sholat',
  '/app/kiblat',
  '/app/tasbih',
  '/app/asmaul-husna',
  '/app/notifikasi',
  '/app/pengaturan',
  '/app/baca/1',
  '/app/halaman/1',
];

const INSTALL_CORE_URLS = [
  '/',
  '/app',
  '/app/surah',
  '/app/baca/1',
  '/app/halaman/1',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/fonts/lpmq.woff2',
  '/fonts/amiri-quran.woff2',
];

let warmingPromise = null;
let lastStatus = {
  running: false,
  phase: 'idle',
  done: 0,
  total: 0,
  surahsCached: 0,
  pagesCached: 0,
  tafsirCached: 0,
  ready: false,
};

async function fetchClean(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res || !res.ok) return null;
    if (res.redirected) {
      const buf = await res.arrayBuffer();
      const headers = new Headers(res.headers);
      headers.delete('content-encoding');
      return new Response(buf, { status: 200, statusText: 'OK', headers });
    }
    return res;
  } catch {
    return null;
  }
}

async function cachePutIfMissing(cache, url) {
  const existing = await cache.match(url, { ignoreSearch: true });
  if (existing) return true;
  const res = await fetchClean(url);
  if (!res) return false;
  await cache.put(url, res);
  return true;
}

async function cacheBatch(cache, urls, concurrency, onStep) {
  let idx = 0;
  async function worker() {
    while (idx < urls.length) {
      const current = urls[idx++];
      await cachePutIfMissing(cache, current).catch(() => false);
      if (onStep) onStep();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
}

async function broadcastStatus(status) {
  lastStatus = status;
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'TQ_OFFLINE_STATUS', ...status });
  }
}

async function loadManifest() {
  try {
    const res = await fetch('/sw-manifest.json', { cache: 'no-cache' });
    if (res.ok) return await res.json();
  } catch {
    // Fallback when running under `astro dev`
  }
  const surahRange = Array.from({ length: 114 }, (_, i) => i + 1);
  return {
    shellPages: FALLBACK_SHELL_PAGES,
    assets: [
      '/favicon.svg',
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/fonts/lpmq.woff2',
      '/fonts/amiri-quran.woff2',
    ],
    quranCore: ['/quran/v1/meta.json', ...surahRange.map((id) => `/quran/v1/surah/${id}.json`)],
    quranExtra: [
      '/quran/v1/search/id.json',
      '/quran/v1/search/en.json',
      '/quran/v1/search/ar.json',
      '/quran/v1/search/tr.json',
      ...surahRange.map((id) => `/quran/v1/tajwid/${id}.json`),
    ],
    tafsir: surahRange.map((id) => `/quran/v1/tafsir/${id}.json`),
  };
}

async function countCachedItems() {
  const [shellCache, quranCache] = await Promise.all([
    caches.open(SHELL_CACHE),
    caches.open(QURAN_CACHE),
  ]);
  const [shellKeys, quranKeys] = await Promise.all([shellCache.keys(), quranCache.keys()]);
  let surahsCached = 0;
  let tafsirCached = 0;
  for (const req of quranKeys) {
    const p = new URL(req.url).pathname;
    if (/^\/quran\/v1\/surah\/\d+\.json$/.test(p)) surahsCached++;
    else if (/^\/quran\/v1\/tafsir\/\d+\.json$/.test(p)) tafsirCached++;
  }
  let pagesCached = 0;
  for (const req of shellKeys) {
    const p = new URL(req.url).pathname;
    if (!/\.[a-z0-9]+$/i.test(p)) pagesCached++;
  }
  return { surahsCached, pagesCached, tafsirCached };
}

function warmOfflineCache(options = {}) {
  if (warmingPromise) return warmingPromise;

  warmingPromise = (async () => {
    try {
      const manifest = await loadManifest();
      if (manifest.dev && !options.forceExtra) {
        const counts = await countCachedItems();
        await broadcastStatus({
          running: false,
          phase: 'idle',
          done: 0,
          total: 0,
          surahsCached: counts.surahsCached,
          pagesCached: counts.pagesCached,
          tafsirCached: counts.tafsirCached,
          ready: counts.surahsCached >= 114,
        });
        return;
      }
      const saveData = Boolean(self.navigator?.connection?.saveData) && !options.forceExtra;

      const shellUrls = [...new Set([...(manifest.shellPages || []), ...(manifest.assets || [])])];
      const coreQuran = manifest.quranCore || [];
      const extraQuran = saveData ? [] : manifest.quranExtra || [];
      const tafsirUrls = saveData ? [] : manifest.tafsir || [];
      const total = shellUrls.length + coreQuran.length + extraQuran.length + tafsirUrls.length;
      let done = 0;
      let lastEmit = 0;

      const emit = async (phase, force = false) => {
        const now = Date.now();
        if (!force && now - lastEmit < 350) return;
        lastEmit = now;
        const counts = await countCachedItems();
        await broadcastStatus({
          running: true,
          phase,
          done,
          total,
          surahsCached: counts.surahsCached,
          pagesCached: counts.pagesCached,
          tafsirCached: counts.tafsirCached,
          ready: counts.surahsCached >= 114,
        });
      };

      const [shellCache, quranCache] = await Promise.all([
        caches.open(SHELL_CACHE),
        caches.open(QURAN_CACHE),
      ]);

      // Stage 1: All menu routes & JS/CSS/font bundles
      await emit('shell', true);
      await cacheBatch(shellCache, shellUrls, 6, () => {
        done++;
        emit('shell');
      });

      // Stage 2: meta.json + ALL 114 surahs (enables all 114 surahs & 604 mushaf pages offline)
      await emit('surah', true);
      await cacheBatch(quranCache, coreQuran, 6, () => {
        done++;
        emit('surah');
      });

      // Stage 3: All 4 search indexes + all 114 tajwid markups
      if (extraQuran.length) {
        await emit('extra', true);
        await cacheBatch(quranCache, extraQuran, 6, () => {
          done++;
          emit('extra');
        });
      }

      // Stage 4: All 114 Tafsir Kemenag RI files (gentle concurrency so UI stays silky smooth)
      if (tafsirUrls.length) {
        await emit('tafsir', true);
        await cacheBatch(quranCache, tafsirUrls, 4, () => {
          done++;
          emit('tafsir');
        });
      }

      const finalCounts = await countCachedItems();
      await broadcastStatus({
        running: false,
        phase: 'done',
        done: total,
        total,
        surahsCached: finalCounts.surahsCached,
        pagesCached: finalCounts.pagesCached,
        tafsirCached: finalCounts.tafsirCached,
        ready: finalCounts.surahsCached >= 114,
      });
    } catch {
      const counts = await countCachedItems().catch(() => ({
        surahsCached: 0,
        pagesCached: 0,
        tafsirCached: 0,
      }));
      await broadcastStatus({
        running: false,
        phase: 'error',
        done: 0,
        total: 0,
        surahsCached: counts.surahsCached,
        pagesCached: counts.pagesCached,
        tafsirCached: counts.tafsirCached,
        ready: counts.surahsCached >= 114,
      });
    } finally {
      warmingPromise = null;
    }
  })();

  return warmingPromise;
}

function isHtmlPageRequest(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) return true;
  const p = url.pathname;
  if (
    p === '/' ||
    p.startsWith('/app') ||
    p.startsWith('/auth') ||
    p === '/panduan' ||
    p === '/tentang' ||
    p === '/privacy-policy'
  ) {
    return !/\.[a-z0-9]+$/i.test(p);
  }
  return false;
}

async function matchRoute(cache, pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const candidates = clean === '/' ? ['/'] : [pathname, clean, `${clean}/`];
  for (const c of candidates) {
    const hit = await cache.match(c, { ignoreSearch: true });
    if (hit) return hit;
  }
  return null;
}

async function matchDynamicTemplate(cache, pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';

  // Offline-first synthesis for ANY Surah /app/baca/1..114 from cached /app/baca/1 template
  const surahMatch = clean.match(/^\/app\/baca\/(\d+)$/);
  if (surahMatch) {
    const id = Number(surahMatch[1]);
    if (id >= 1 && id <= 114) {
      const tpl = await matchRoute(cache, '/app/baca/1');
      if (tpl) {
        const html = (await tpl.text())
          .replace(/(&quot;surahId&quot;:\[0,)\d+(\])/g, (_, pre, post) => pre + id + post)
          .replace(/Baca Surah ke-\d+/g, `Baca Surah ke-${id}`);
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
  }

  // Offline-first synthesis for ANY Mushaf Page /app/halaman/1..604 from cached /app/halaman/1 template
  const pageMatch = clean.match(/^\/app\/halaman\/(\d+)$/);
  if (pageMatch) {
    const page = Number(pageMatch[1]);
    if (page >= 1 && page <= 604) {
      const tpl = await matchRoute(cache, '/app/halaman/1');
      if (tpl) {
        const html = (await tpl.text())
          .replace(/(&quot;pageNumber&quot;:\[0,)\d+(\])/g, (_, pre, post) => pre + page + post)
          .replace(/Halaman \d+ Mushaf/g, `Halaman ${page} Mushaf`);
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
  }

  return null;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const [shellCache, quranCache] = await Promise.all([
        caches.open(SHELL_CACHE),
        caches.open(QURAN_CACHE),
      ]);
      await Promise.all([
        cacheBatch(shellCache, INSTALL_CORE_URLS, 4),
        cachePutIfMissing(quranCache, '/quran/v1/meta.json'),
      ]);
    })()
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, QURAN_CACHE, AUDIO_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        warmOfflineCache();
      })
  );
});

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'TQ_WARM_OFFLINE') {
    event.waitUntil(warmOfflineCache({ forceExtra: Boolean(msg.forceExtra) }));
  } else if (msg.type === 'TQ_GET_OFFLINE_STATUS') {
    event.waitUntil(
      countCachedItems().then((counts) => {
        const payload = {
          ...lastStatus,
          surahsCached: counts.surahsCached,
          pagesCached: counts.pagesCached,
          tafsirCached: counts.tafsirCached,
          ready: counts.surahsCached >= 114,
        };
        event.source?.postMessage?.({ type: 'TQ_OFFLINE_STATUS', ...payload });
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never intercept Vite dev internals or the manifest probe
  if (
    url.origin === self.location.origin &&
    (url.pathname === '/sw-manifest.json' ||
      url.pathname.startsWith('/@vite') ||
      url.pathname.startsWith('/@id') ||
      url.pathname.startsWith('/@fs') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.startsWith('/node_modules/'))
  ) {
    return;
  }

  // 1. Quran JSON data (meta, 114 surahs, 4 search indexes, 114 tajwid, 114 tafsir): strict Cache-First
  if (url.origin === self.location.origin && url.pathname.startsWith('/quran/v1/')) {
    event.respondWith(
      caches.open(QURAN_CACHE).then(async (cache) => {
        const hit = await cache.match(request, { ignoreSearch: true });
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) {
            cache.put(request, res.clone()).catch(() => {});
          }
          return res;
        } catch {
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
        }
      })
    );
    return;
  }

  // 2. Audio CDN: Cache-First from offline audio cache
  if (url.hostname === 'cdn.islamic.network' || url.hostname === 'cdn.alquran.cloud') {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          return await fetch(request);
        } catch {
          return new Response('', { status: 503, statusText: 'Offline' });
        }
      })
    );
    return;
  }

  // 3. Same-origin static assets (hashed JS/CSS bundles, fonts, icons): strict Cache-First
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
        try {
          const res = await fetch(request);
          if (res.ok) {
            cache.put(request, res.clone()).catch(() => {});
          }
          return res;
        } catch {
          return new Response('', { status: 503, statusText: 'Offline' });
        }
      })
    );
    return;
  }

  // 4. Same-origin HTML pages (browser navigation & Astro ClientRouter):
  // TRUE OFFLINE-FIRST -> serve immediately from cache (or synthesized surah/page template)
  // and refresh static shell quietly in the background when online!
  if (isHtmlPageRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const clean = url.pathname.replace(/\/+$/, '') || '/';
        const isDynamicSurah = /^\/app\/baca\/(\d+)$/.test(clean) && clean !== '/app/baca/1';
        const isDynamicPage = /^\/app\/halaman\/(\d+)$/.test(clean) && clean !== '/app/halaman/1';

        const cachedExact = await matchRoute(cache, url.pathname);
        if (cachedExact) {
          // Stale-while-revalidate quietly in background (never blocks offline or flaky networks!)
          event.waitUntil(
            fetchClean(clean)
              .then((fresh) => {
                if (fresh) return cache.put(clean, fresh);
              })
              .catch(() => {})
          );
          return cachedExact;
        }

        // Instant offline-first template synthesis for /app/baca/2..114 and /app/halaman/2..604
        const dynamicTpl = await matchDynamicTemplate(cache, url.pathname);
        if (dynamicTpl) {
          return dynamicTpl;
        }

        // First-ever uncached visit: fetch from network and cache clean response
        try {
          const fresh = await fetchClean(request.url);
          if (fresh) {
            if (!isDynamicSurah && !isDynamicPage) {
              cache.put(clean, fresh.clone()).catch(() => {});
            }
            return fresh;
          }
        } catch {
          // Offline fallback below
        }

        const fallback = (await matchRoute(cache, '/app')) || (await matchRoute(cache, '/'));
        if (fallback) return fallback;

        return new Response('Offline — buka aplikasi sekali saat terhubung internet untuk menyimpan data.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })()
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
