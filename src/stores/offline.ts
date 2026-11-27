import { signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import { QURAN_BASE_PATH, QURAN_OFFLINE_CACHE } from '@/lib/quran/api';
import { showToast } from './toast';

export interface OfflineQuranMeta {
  savedAt: number;
  filesCount: number;
}

const KEY = 'tq:offline:quran';

export const offlineQuranMeta = signal<OfflineQuranMeta | null>(
  readStorage<OfflineQuranMeta | null>(KEY, null)
);
export const offlineJob = signal<{ done: number; total: number; cancelled: boolean } | null>(null);

export async function saveOfflineQuran(): Promise<void> {
  if (typeof caches === 'undefined') {
    showToast('Browser ini tidak mendukung penyimpanan offline.', { variant: 'error' });
    return;
  }

  const urls: string[] = [
    `${QURAN_BASE_PATH}/meta.json`,
    `${QURAN_BASE_PATH}/search/id.json`,
    `${QURAN_BASE_PATH}/search/ar.json`,
    `${QURAN_BASE_PATH}/search/tr.json`,
    ...Array.from({ length: 114 }, (_, i) => `${QURAN_BASE_PATH}/surah/${i + 1}.json`),
    ...Array.from({ length: 114 }, (_, i) => `${QURAN_BASE_PATH}/tajwid/${i + 1}.json`),
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
      const res = await fetch(urls[i]);
      if (!res.ok) throw new Error('fetch-failed');
      await cache.put(urls[i], res);
      offlineJob.value = { done: i + 1, total: urls.length, cancelled: false };
    }
    const meta: OfflineQuranMeta = { savedAt: Date.now(), filesCount: urls.length };
    offlineQuranMeta.value = meta;
    writeStorage(KEY, meta);
    offlineJob.value = null;
    showToast("Al-Qur'an tersimpan dan bisa dibaca tanpa internet.", { variant: 'success' });
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
  showToast("Al-Qur'an offline dihapus dari perangkat ini.");
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
