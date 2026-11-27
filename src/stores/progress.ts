import { computed, signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import { createMask, encodeMask, juzCoverage, markAyahs } from '@/lib/quran/ayah-mask';
import { addDaysToDateKey, formatDateKey, TOTAL_AYAHS } from '@/lib/quran/meta';
import { currentUid } from './auth';
import { listenUserSubCol, putUserSubDoc, upsertUserProfile } from '@/lib/firebase/firestore';
import { showToast } from './toast';

export interface ReadingGoal {
  unit: 'ayah' | 'page' | 'juz';
  amount: number;
  targetDate?: string | null;
}

export interface ReadingDayLog {
  date: string; // YYYY-MM-DD
  ayahIds: number[];
  ayahCount: number;
  goalMet: boolean;
  updatedAt: number;
}

export interface KhatamCycle {
  id: string;
  readMask: string;
  readCount: number;
  startedAt: number;
  completedAt: number | null;
  active: boolean;
}

const KEYS = {
  goal: 'tq:guest:readingGoal',
  days: 'tq:guest:readingDays',
  khatam: 'tq:guest:khatam',
} as const;

function defaultKhatam(): KhatamCycle {
  return {
    id: `k_${Date.now()}`,
    readMask: encodeMask(createMask()),
    readCount: 0,
    startedAt: Date.now(),
    completedAt: null,
    active: true,
  };
}

export const readingGoal = signal<ReadingGoal | null>(readStorage<ReadingGoal | null>(KEYS.goal, null));
export const readingDays = signal<Record<string, ReadingDayLog>>(
  readStorage<Record<string, ReadingDayLog>>(KEYS.days, {})
);
export const khatamCycles = signal<KhatamCycle[]>(
  readStorage<KhatamCycle[]>(KEYS.khatam, [defaultKhatam()])
);

export const activeKhatam = computed(() => {
  return khatamCycles.value.find((k) => k.active) ?? khatamCycles.value[0] ?? defaultKhatam();
});

export const khatamPercent = computed(() =>
  Math.min(100, Math.round((activeKhatam.value.readCount / TOTAL_AYAHS) * 100))
);

export const khatamJuzProgress = computed(() => juzCoverage(activeKhatam.value.readMask));

export function goalToAyahTarget(goal: ReadingGoal | null): number {
  if (!goal) return 0;
  if (goal.unit === 'ayah') return goal.amount;
  if (goal.unit === 'page') return Math.round(goal.amount * 10.3);
  return Math.round(goal.amount * 208);
}

export const todayLog = computed<ReadingDayLog>(() => {
  const key = formatDateKey();
  return (
    readingDays.value[key] ?? {
      date: key,
      ayahIds: [],
      ayahCount: 0,
      goalMet: false,
      updatedAt: 0,
    }
  );
});

export const todayTargetAyahs = computed(() => goalToAyahTarget(readingGoal.value));

export const currentStreak = computed(() => {
  let streak = 0;
  const todayKey = formatDateKey();
  const hasToday = (readingDays.value[todayKey]?.ayahCount ?? 0) > 0;
  let offset = hasToday ? 0 : -1;
  while (true) {
    const key = addDaysToDateKey(todayKey, offset);
    if ((readingDays.value[key]?.ayahCount ?? 0) > 0) {
      streak += 1;
      offset -= 1;
    } else {
      break;
    }
  }
  return streak;
});

export const longestStreak = computed(() => {
  const dates = Object.values(readingDays.value)
    .filter((d) => d.ayahCount > 0)
    .map((d) => d.date)
    .sort();
  if (!dates.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (addDaysToDateKey(dates[i - 1], 1) === dates[i]) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
});

let syncedUid: string | null = null;
let unsubs: Array<() => void> = [];

export function bindProgressSync(uid: string | null): void {
  if (syncedUid === uid) return;
  unsubs.forEach((u) => u());
  unsubs = [];
  syncedUid = uid;
  if (!uid) return;

  unsubs.push(
    listenUserSubCol<ReadingDayLog>(uid, 'reading_days', (docs) => {
      const map: Record<string, ReadingDayLog> = {};
      for (const d of docs) map[d.date || d.id] = d;
      readingDays.value = map;
    }),
    listenUserSubCol<Omit<KhatamCycle, 'id'>>(uid, 'khatam', (docs) => {
      if (docs.length) khatamCycles.value = docs.sort((a, b) => b.startedAt - a.startedAt);
    })
  );
}

export function recordReadAyahs(globalIds: readonly number[]): void {
  const valid = [...new Set(globalIds.filter((id) => Number.isInteger(id) && id >= 1 && id <= TOTAL_AYAHS))];
  if (!valid.length) return;

  const todayKey = formatDateKey();
  const prev = readingDays.value[todayKey] ?? {
    date: todayKey,
    ayahIds: [],
    ayahCount: 0,
    goalMet: false,
    updatedAt: Date.now(),
  };

  const mergedIds = [...new Set([...prev.ayahIds, ...valid])];
  const targetAyahs = goalToAyahTarget(readingGoal.value);
  const goalMet = targetAyahs > 0 && mergedIds.length >= targetAyahs;
  const justMetGoal = goalMet && !prev.goalMet;

  const updatedDay: ReadingDayLog = {
    date: todayKey,
    ayahIds: mergedIds,
    ayahCount: mergedIds.length,
    goalMet,
    updatedAt: Date.now(),
  };

  if (mergedIds.length !== prev.ayahIds.length) {
    readingDays.value = { ...readingDays.value, [todayKey]: updatedDay };
    writeStorage(KEYS.days, readingDays.value);
  }

  // Update active khatam bitmask
  const curK = activeKhatam.value;
  const res = markAyahs(curK.readMask, valid);
  if (res.added > 0) {
    const completedAt = res.readCount >= TOTAL_AYAHS ? curK.completedAt ?? Date.now() : null;
    const nextK: KhatamCycle = { ...curK, readMask: res.readMask, readCount: res.readCount, completedAt };
    khatamCycles.value = khatamCycles.value.some((k) => k.id === curK.id)
      ? khatamCycles.value.map((k) => (k.id === curK.id ? nextK : k))
      : [nextK, ...khatamCycles.value];
    writeStorage(KEYS.khatam, khatamCycles.value);

    const uid = currentUid.value;
    if (uid) {
      putUserSubDoc(uid, 'reading_days', todayKey, updatedDay).catch(() => {});
      putUserSubDoc(uid, 'khatam', nextK.id, nextK).catch(() => {});
    }
  }

  if (justMetGoal) {
    showToast('Target harian tercapai. Barakallahu fiik!', { variant: 'success' });
  }
}

export function setReadingGoal(goal: ReadingGoal | null): void {
  readingGoal.value = goal;
  writeStorage(KEYS.goal, goal);
  const uid = currentUid.value;
  if (uid) upsertUserProfile(uid, { readingGoal: goal }).catch(() => {});
  showToast(goal ? 'Target harian disimpan.' : 'Target harian dihapus.', {
    variant: goal ? 'success' : 'info',
  });
}

export function startNewKhatam(): void {
  const archived = khatamCycles.value.map((k) => ({ ...k, active: false }));
  const fresh = defaultKhatam();
  khatamCycles.value = [fresh, ...archived];
  writeStorage(KEYS.khatam, khatamCycles.value);
  const uid = currentUid.value;
  if (uid) {
    putUserSubDoc(uid, 'khatam', fresh.id, fresh).catch(() => {});
    for (const old of archived) {
      putUserSubDoc(uid, 'khatam', old.id, old).catch(() => {});
    }
  }
  showToast('Khatam baru dimulai.', { variant: 'success' });
}
