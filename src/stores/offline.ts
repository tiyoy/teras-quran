import { signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import { QURAN_BASE_PATH, QURAN_OFFLINE_CACHE } from '@/lib/quran/api';
import { showToast } from './toast';

export interface OfflineQuranMeta {
  savedAt: number;
  filesCount: number;
  includesTafsir?: boolean;
}

export interface AutoOfflineStatus {
  running: boolean;
  phase: string;
  done: number;
  total: number;
  surahsCached: number;
  pagesCached: number;
  tafsirCached: number;
  ready: boolean;
}

const KEY = 'tq:offline:quran';

export const offlineQuranMeta = signal<OfflineQuranMeta | null>(
  readStorage<OfflineQuranMeta | null>(KEY, null)
);
export const offlineJob = signal<{ done: number; total: number; cancelled: boolean } | null>(null);
export const autoOfflineStatus = signal<AutoOfflineStatus>({
  running: false,
  phase: 'idle',
  done: 0,
  total: 0,
  surahsCached: 0,
  pagesCached: 0,
  tafsirCached: 0,
  ready: false,
});

let syncBound = false;

export async function inspectOfflineStatus(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const qCache = await caches.open(QURAN_OFFLINE_CACHE);
    const qKeys = await qCache.keys();
    let surahsCached = 0;
    let tafsirCached = 0;
    for (const req of qKeys) {
      const p = new URL(req.url).pathname;
      if (/^\/quran\/v1\/surah\/\d+\.json$/.test(p)) surahsCached++;
      else if (/^\/quran\/v1\/tafsir\/\d+\.json$/.test(p)) tafsirCached++;
    }

    let pagesCached = 0;
    const names = await caches.keys();
    const shellName = names.find((n) => n.startsWith('tq-shell-'));
    if (shellName) {
      const sCache = await caches.open(shellName);
      const sKeys = await sCache.keys();
      for (const req of sKeys) {
        const p = new URL(req.url).pathname;
        if (!/\.[a-z0-9]+$/i.test(p)) pagesCached++;
      }
    }

    const ready = surahsCached >= 114;
    autoOfflineStatus.value = {
      ...autoOfflineStatus.value,
      surahsCached,
      pagesCached,
      tafsirCached,
      ready,
    };

    if (ready && !offlineQuranMeta.value) {
      const meta: OfflineQuranMeta = {
        savedAt: Date.now(),
        filesCount: qKeys.length,
        includesTafsir: tafsirCached >= 114,
      };
      offlineQuranMeta.value = meta;
      writeStorage(KEY, meta);
    }
  } catch {
    // ignore storage inspection failure
  }
}

export function triggerAutoOfflineWarm(forceExtra = false): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!navigator.onLine) return;
  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({ type: 'TQ_WARM_OFFLINE', forceExtra });
    })
    .catch(() => {});
}

export function initOfflineSync(): void {
  if (typeof window === 'undefined') return;
  inspectOfflineStatus();

  if (syncBound) return;
  syncBound = true;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.type !== 'TQ_OFFLINE_STATUS') return;
      autoOfflineStatus.value = {
        ...autoOfflineStatus.value,
        running: Boolean(msg.running),
        phase: String(msg.phase || 'idle'),
        done: Number(msg.done || 0),
        total: Number(msg.total || 0),
        surahsCached: Number(msg.surahsCached ?? autoOfflineStatus.value.surahsCached),
        pagesCached: Number(msg.pagesCached ?? autoOfflineStatus.value.pagesCached),
        ready: Boolean(msg.ready),
      };
      if (!msg.running && msg.ready) {
        inspectOfflineStatus();
      }
    });

    triggerAutoOfflineWarm();
    window.addEventListener('online', () => triggerAutoOfflineWarm());
  }
}

export async function saveOfflineQuran(includeTafsir = false): Promise<void> {
  if (typeof caches === 'undefined') {
    showToast('Browser ini tidak mendukung penyimpanan offline.', { variant: 'error' });
    return;
  }

  const urls: string[] = [
    `${QURAN_BASE_PATH}/meta.json`,
    `${QURAN_BASE_PATH}/search/id.json`,
    `${QURAN_BASE_PATH}/search/en.json`,
    `${QURAN_BASE_PATH}/search/ar.json`,
    `${QURAN_BASE_PATH}/search/tr.json`,
    ...Array.from({ length: 114 }, (_, i) => `${QURAN_BASE_PATH}/surah/${i + 1}.json`),
    ...Array.from({ length: 114 }, (_, i) => `${QURAN_BASE_PATH}/tajwid/${i + 1}.json`),
    ...(includeTafsir
      ? Array.from({ length: 114 }, (_, i) => `${QURAN_BASE_PATH}/tafsir/${i + 1}.json`)
      : []),
  ];

  const cache = await caches.open(QURAN_OFFLINE_CACHE);
  offlineJob.value = { done: 0, total: urls.length, cancelled: false };

  try {
    for (let i = 0; i < urls.length; i++) {
      if (offlineJob.value?.cancelled) {
        offlineJob.value = null;
        showToast('Penyimpanan offline dibatalkan.');
        return;
      }
      const existing = await cache.match(urls[i], { ignoreSearch: true });
      if (!existing) {
        const res = await fetch(urls[i]);
        if (!res.ok) throw new Error('fetch-failed');
        await cache.put(urls[i], res);
      }
      offlineJob.value = { done: i + 1, total: urls.length, cancelled: false };
    }
    const meta: OfflineQuranMeta = {
      savedAt: Date.now(),
      filesCount: urls.length,
      includesTafsir: includeTafsir,
    };
    offlineQuranMeta.value = meta;
    writeStorage(KEY, meta);
    offlineJob.value = null;
    triggerAutoOfflineWarm(true);
    await inspectOfflineStatus();
    showToast(
      includeTafsir
        ? "Seluruh 114 surah, tajwid, pencarian, dan tafsir Kemenag RI tersimpan offline."
        : "Al-Qur'an tersimpan dan bisa dibaca tanpa internet.",
      { variant: 'success' }
    );
  } catch {
    offlineJob.value = null;
    showToast('Penyimpanan gagal. Periksa koneksi lalu coba lagi.', { variant: 'error' });
  }
}

export function cancelOfflineQuran(): void {
  if (offlineJob.value) {
    offlineJob.value = { ...offlineJob.value, cancelled: true };
  }
}

export async function removeOfflineQuran(): Promise<void> {
  if (typeof caches !== 'undefined') {
    await caches.delete(QURAN_OFFLINE_CACHE).catch(() => {});
  }
  offlineQuranMeta.value = null;
  writeStorage(KEY, null);
  autoOfflineStatus.value = {
    ...autoOfflineStatus.value,
    surahsCached: 0,
    tafsirCached: 0,
    ready: false,
  };
  showToast("Cache Al-Qur'an offline dihapus dari perangkat ini.");
}

export async function estimateFreeSpaceMB(): Promise<number | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    if (typeof est.quota === 'number' && typeof est.usage === 'number') {
      return Math.max(0, Math.round((est.quota - est.usage) / (1024 * 1024)));
    }
  } catch {
    // ignore
  }
  return null;
}
