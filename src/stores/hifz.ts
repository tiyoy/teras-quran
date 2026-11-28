import { computed, signal } from '@preact/signals';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';
import {
  buildBulkImportRanges,
  getHifzStrength,
  mergeHifzRange,
  rateHifzItem,
  type HifzItem,
  type HifzRange,
  type HifzRating,
} from '@/lib/hifz/sm2';
import { createMask, countBits, juzCoverage, setBit } from '@/lib/quran/ayah-mask';
import { formatDateKey, SURAH_AYAH_COUNTS, toGlobalAyah } from '@/lib/quran/meta';
import { currentUid } from './auth';
import { listenUserSubCol, putUserSubDoc, removeUserSubDoc } from '@/lib/firebase/firestore';
import { showToast } from './toast';

const KEY = 'tq:guest:hifz';

export const hifzItems = signal<HifzItem[]>(readStorage<HifzItem[]>(KEY, []));

export const dueHifzItems = computed(() => {
  const today = formatDateKey();
  return hifzItems.value
    .filter((it) => it.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.surahId - b.surahId || a.fromAyah - b.fromAyah);
});

export const weakHifzItems = computed(() =>
  hifzItems.value.filter((it) => getHifzStrength(it) === 'weak')
);

export const hifzMask = computed(() => {
  const mask = createMask();
  for (const it of hifzItems.value) {
    const start = toGlobalAyah(it.surahId, it.fromAyah);
    const end = toGlobalAyah(it.surahId, it.toAyah);
    if (start && end) {
      for (let g = start; g <= end; g++) setBit(mask, g);
    }
  }
  return mask;
});

export const hifzJuzProgress = computed(() => juzCoverage(hifzMask.value));

export const hifzSurahProgress = computed(() => {
  const sets = SURAH_AYAH_COUNTS.map(() => new Set<number>());
  for (const it of hifzItems.value) {
    const set = sets[it.surahId - 1];
    if (!set) continue;
    const max = SURAH_AYAH_COUNTS[it.surahId - 1];
    for (let n = Math.max(1, it.fromAyah); n <= Math.min(max, it.toAyah); n++) {
      set.add(n);
    }
  }
  return SURAH_AYAH_COUNTS.map((total, idx) => ({
    surahId: idx + 1,
    memorized: sets[idx].size,
    total,
    complete: sets[idx].size === total,
  }));
});

export const hifzTotals = computed(() => ({
  ayahs: countBits(hifzMask.value),
  surahs: hifzSurahProgress.value.filter((s) => s.complete).length,
  juz: hifzJuzProgress.value.filter((v) => v >= 1).length,
}));

let syncedUid: string | null = null;
let unsub: (() => void) | null = null;

export function readLocalHifzSnapshot(): HifzItem[] {
  return readStorage<HifzItem[]>(KEY, []);
}

export function applySyncedHifz(list: HifzItem[]): void {
  persistLocal(list);
}

export function clearLocalHifz(): void {
  removeStorage(KEY);
  hifzItems.value = [];
}

export function bindHifzSync(uid: string | null): void {
  if (syncedUid === uid) return;
  unsub?.();
  unsub = null;
  syncedUid = uid;
  if (!uid) {
    hifzItems.value = readStorage<HifzItem[]>(KEY, []);
    return;
  }
  unsub = listenUserSubCol<Omit<HifzItem, 'id'>>(uid, 'hafalan', (docs) => {
    persistLocal(docs);
  });
}

function persistLocal(list: HifzItem[]) {
  hifzItems.value = list;
  writeStorage(KEY, list);
}

export function addHifzRange(range: HifzRange): 'added' | 'merged' | 'unchanged' {
  const plan = mergeHifzRange(hifzItems.value, range, Date.now(), formatDateKey());
  if (!plan.target) {
    showToast('Ayat ini sudah tercatat sebagai hafalan.');
    return 'unchanged';
  }
  const uid = currentUid.value;
  const id = plan.target.id ?? `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nextItem: HifzItem = { ...plan.target.data, id };
  const isMerge = Boolean(plan.target.id || plan.remove.length);

  const filtered = hifzItems.value.filter((it) => it.id !== id && !plan.remove.includes(it.id));
  persistLocal([...filtered, nextItem]);

  if (uid) {
    putUserSubDoc(uid, 'hafalan', id, nextItem).catch(() => {});
    for (const rid of plan.remove) {
      removeUserSubDoc(uid, 'hafalan', rid).catch(() => {});
    }
  }

  showToast(isMerge ? 'Hafalan digabung dengan yang sudah ada.' : 'Hafalan dicatat.', {
    variant: 'success',
  });
  return isMerge ? 'merged' : 'added';
}

export function importBulkHifz(kind: 'surah' | 'juz', targetId: number): number {
  const specs = buildBulkImportRanges(kind, targetId);
  let list = [...hifzItems.value];
  const today = formatDateKey();
  const now = Date.now();
  const uid = currentUid.value;
  let written = 0;

  for (const spec of specs) {
    const plan = mergeHifzRange(list, spec.range, now, today, spec.initial);
    if (!plan.target) continue;
    const id = plan.target.id ?? `h_${now}_${written}_${Math.random().toString(36).slice(2, 5)}`;
    const nextItem: HifzItem = { ...plan.target.data, id };
    list = list.filter((it) => it.id !== id && !plan.remove.includes(it.id));
    list.push(nextItem);
    written += 1;

    if (uid) {
      putUserSubDoc(uid, 'hafalan', id, nextItem).catch(() => {});
      for (const rid of plan.remove) {
        removeUserSubDoc(uid, 'hafalan', rid).catch(() => {});
      }
    }
  }

  if (written > 0) {
    persistLocal(list);
    showToast(`${written} hafalan dicatat. Murajaah dijadwalkan bertahap 30 hari.`, {
      variant: 'success',
    });
  } else {
    showToast('Seluruh ayat ini sudah tercatat sebagai hafalan.');
  }
  return written;
}

export function reviewHifzItem(id: string, rating: HifzRating): HifzItem | null {
  const item = hifzItems.value.find((it) => it.id === id);
  if (!item) return null;
  const outcome = rateHifzItem(item, rating, formatDateKey());
  const updated: HifzItem = {
    ...item,
    ...outcome,
    lastReviewedAt: Date.now(),
    lastRating: rating,
    reviewCount: item.reviewCount + 1,
  };
  persistLocal(hifzItems.value.map((it) => (it.id === id ? updated : it)));
  const uid = currentUid.value;
  if (uid) {
    putUserSubDoc(uid, 'hafalan', id, updated).catch(() => {});
  }
  return updated;
}

export function removeHifzItem(id: string): void {
  persistLocal(hifzItems.value.filter((it) => it.id !== id));
  const uid = currentUid.value;
  if (uid) removeUserSubDoc(uid, 'hafalan', id).catch(() => {});
  showToast('Hafalan dihapus.');
}
