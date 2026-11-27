import {
  addDaysToDateKey,
  fromGlobalAyah,
  getSurahAyahCount,
  JUZ_START_AYAH,
  TOTAL_AYAHS,
} from '@/lib/quran/meta';

export type HifzRating = 1 | 3 | 4 | 5;
export type HifzStrength = 'weak' | 'fair' | 'strong';

export interface HifzRange {
  surahId: number;
  fromAyah: number;
  toAyah: number;
}

export interface HifzItem extends HifzRange {
  id: string;
  ayahCount: number;
  memorizedAt: number;
  ease: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReviewedAt: number | null;
  lastRating: HifzRating | null;
  reviewCount: number;
}

export type HifzItemData = Omit<HifzItem, 'id'>;

const EASE_START = 2.5;
const EASE_MIN = 1.3;
const EASE_MAX = 3.0;
const INTERVAL_MAX = 60;

const clampEase = (val: number) =>
  Math.round(Math.min(EASE_MAX, Math.max(EASE_MIN, val)) * 100) / 100;

const clampInterval = (val: number) => Math.min(INTERVAL_MAX, Math.max(1, Math.round(val)));

function baseNextInterval(nextRep: number, prevInterval: number, ease: number): number {
  if (nextRep <= 1) return 1;
  if (nextRep === 2) return 3;
  return prevInterval * ease;
}

export function rateHifzItem(
  item: Pick<HifzItem, 'ease' | 'interval' | 'repetitions'>,
  rating: HifzRating,
  todayKey: string
): { ease: number; interval: number; repetitions: number; dueDate: string } {
  const ease = clampEase(Number.isFinite(item.ease) ? item.ease : EASE_START);
  const interval = Math.max(0, Number.isFinite(item.interval) ? item.interval : 0);
  const reps = Math.max(0, Math.floor(Number.isFinite(item.repetitions) ? item.repetitions : 0));

  let nextEase = ease;
  let nextInterval = 1;
  let nextReps = reps;

  if (rating === 1) {
    nextEase = ease - 0.2;
    nextInterval = 1;
    nextReps = 0;
  } else if (rating === 3) {
    const standard = baseNextInterval(reps + 1, interval, ease);
    nextEase = ease - 0.15;
    nextInterval = Math.min(interval > 0 ? interval * 1.2 : 1, standard);
    nextReps = reps + 1;
  } else {
    nextEase = rating === 5 ? ease + 0.1 : ease;
    nextInterval = baseNextInterval(reps + 1, interval, ease);
    nextReps = reps + 1;
  }

  const finalInterval = clampInterval(nextInterval);
  return {
    ease: clampEase(nextEase),
    interval: finalInterval,
    repetitions: nextReps,
    dueDate: addDaysToDateKey(todayKey, finalInterval),
  };
}

export function getHifzStrength(
  item: Pick<HifzItem, 'ease' | 'interval' | 'lastRating'>
): HifzStrength {
  if (item.ease < 1.8 || item.lastRating === 1) return 'weak';
  if (item.interval >= 21) return 'strong';
  return 'fair';
}

export function isValidHifzRange(range: HifzRange): boolean {
  const max = getSurahAyahCount(range.surahId);
  return (
    max > 0 &&
    Number.isInteger(range.fromAyah) &&
    Number.isInteger(range.toAyah) &&
    range.fromAyah >= 1 &&
    range.fromAyah <= range.toAyah &&
    range.toAyah <= max
  );
}

export function createHifzData(
  range: HifzRange,
  nowMs: number,
  todayKey: string,
  initial: Partial<Pick<HifzItemData, 'ease' | 'interval' | 'repetitions'>> = {}
): HifzItemData {
  const interval = initial.interval ?? 1;
  return {
    surahId: range.surahId,
    fromAyah: range.fromAyah,
    toAyah: range.toAyah,
    ayahCount: range.toAyah - range.fromAyah + 1,
    memorizedAt: nowMs,
    ease: initial.ease ?? EASE_START,
    interval,
    repetitions: initial.repetitions ?? 0,
    dueDate: addDaysToDateKey(todayKey, interval),
    lastReviewedAt: null,
    lastRating: null,
    reviewCount: 0,
  };
}

function moreUrgent(a: HifzItemData, b: HifzItemData): HifzItemData {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? a : b;
  if (a.interval !== b.interval) return a.interval < b.interval ? a : b;
  return a.ease < b.ease ? a : b;
}

const stripId = ({ id: _id, ...rest }: HifzItem): HifzItemData => rest;

export interface MergePlan {
  target: { id: string | null; data: HifzItemData } | null;
  remove: string[];
  covering: HifzItem | null;
}

export function mergeHifzRange(
  existing: readonly HifzItem[],
  range: HifzRange,
  nowMs: number,
  todayKey: string,
  initial: Partial<Pick<HifzItemData, 'ease' | 'interval' | 'repetitions'>> = {}
): MergePlan {
  if (!isValidHifzRange(range)) {
    throw new RangeError('invalid-range');
  }

  const sameSurah = existing.filter((it) => it.surahId === range.surahId);
  const covering =
    sameSurah.find((it) => it.fromAyah <= range.fromAyah && it.toAyah >= range.toAyah) ?? null;
  if (covering) {
    return { target: null, remove: [], covering };
  }

  let from = range.fromAyah;
  let to = range.toAyah;
  const touched: HifzItem[] = [];

  let grew = true;
  while (grew) {
    grew = false;
    for (const item of sameSurah) {
      if (touched.includes(item)) continue;
      if (item.fromAyah <= to + 1 && item.toAyah >= from - 1) {
        touched.push(item);
        from = Math.min(from, item.fromAyah);
        to = Math.max(to, item.toAyah);
        grew = true;
      }
    }
  }

  const fresh = createHifzData(range, nowMs, todayKey, initial);
  if (!touched.length) {
    return { target: { id: null, data: fresh }, remove: [], covering: null };
  }

  touched.sort((a, b) => a.fromAyah - b.fromAyah);
  const hasNewAyahs = Array.from(
    { length: range.toAyah - range.fromAyah + 1 },
    (_, i) => range.fromAyah + i
  ).some((n) => !touched.some((it) => it.fromAyah <= n && it.toAyah >= n));

  const candidates = [...touched.map(stripId), ...(hasNewAyahs ? [fresh] : [])];
  const winner = candidates.reduce(moreUrgent);
  const keeper = touched.find((_, i) => candidates[i] === winner) ?? touched[0];
  const earliestMem = Math.min(...candidates.map((c) => c.memorizedAt));

  return {
    target: {
      id: keeper.id,
      data: {
        ...winner,
        surahId: range.surahId,
        fromAyah: from,
        toAyah: to,
        ayahCount: to - from + 1,
        memorizedAt: earliestMem,
      },
    },
    remove: touched.filter((it) => it.id !== keeper.id).map((it) => it.id),
    covering: null,
  };
}

export interface BulkImportSpec {
  range: HifzRange;
  initial: { interval: number; repetitions: number };
}

export function buildBulkImportRanges(kind: 'surah' | 'juz', id: number): BulkImportSpec[] {
  const ranges: HifzRange[] = [];

  if (kind === 'surah') {
    const count = getSurahAyahCount(id);
    if (count > 0) ranges.push({ surahId: id, fromAyah: 1, toAyah: count });
  } else if (Number.isInteger(id) && id >= 1 && id <= 30) {
    const start = JUZ_START_AYAH[id - 1];
    const end = (JUZ_START_AYAH[id] ?? TOTAL_AYAHS + 1) - 1;
    let cur = start;
    while (cur <= end) {
      const pos = fromGlobalAyah(cur);
      if (!pos) break;
      const maxInSurah = getSurahAyahCount(pos.surah);
      const to = Math.min(maxInSurah, pos.ayah + (end - cur));
      ranges.push({ surahId: pos.surah, fromAyah: pos.ayah, toAyah: to });
      cur += to - pos.ayah + 1;
    }
  }

  return ranges.map((range, idx) => ({
    range,
    initial: {
      interval: 1 + Math.floor((idx * 30) / Math.max(1, ranges.length)),
      repetitions: 2,
    },
  }));
}
