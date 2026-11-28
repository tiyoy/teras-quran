import { computed, signal } from '@preact/signals';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';
import { DEFAULT_TASBIH_PRESETS, type TasbihPreset } from '@/data/tasbih-presets';
import {
  createBadaSholatState,
  tapBadaSholat,
  tapTasbih,
  undoTasbih,
  validateCustomTarget,
  type BadaSholatState,
  type TasbihCounterState,
} from '@/lib/tasbih/tasbih-logic';
import { playClickTone } from '@/lib/tasbih/sound';
import { triggerHaptic } from '@/lib/tasbih/haptic';
import { formatDateKey } from '@/lib/quran/meta';
import { currentUid } from './auth';
import { listenUserSubCol, putUserSubDoc, removeUserSubDoc } from '@/lib/firebase/firestore';
import { showToast } from './toast';

export interface TasbihPrefs {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  autoNextRound: boolean;
  wakeLockEnabled: boolean;
}

export interface TasbihDayLog {
  date: string;
  totalCount: number;
  byPreset: Record<string, number>;
  updatedAt: number;
}

export interface TasbihActiveState {
  mode: 'single' | 'bada-sholat';
  activePresetId: string;
  counters: Record<string, TasbihCounterState>;
  badaSholat: BadaSholatState;
}

const KEYS = {
  presets: 'tq:tasbih:presets',
  state: 'tq:tasbih:state',
  logs: 'tq:tasbih:logs',
  prefs: 'tq:tasbih:prefs',
} as const;

const DEFAULT_PREFS: TasbihPrefs = {
  soundEnabled: true,
  hapticEnabled: true,
  autoNextRound: true,
  wakeLockEnabled: false,
};

const DEFAULT_STATE: TasbihActiveState = {
  mode: 'single',
  activePresetId: DEFAULT_TASBIH_PRESETS[0].id,
  counters: {},
  badaSholat: createBadaSholatState(),
};

export const tasbihPresets = signal<TasbihPreset[]>(
  readStorage<TasbihPreset[]>(KEYS.presets, [...DEFAULT_TASBIH_PRESETS])
);
export const tasbihState = signal<TasbihActiveState>({
  ...DEFAULT_STATE,
  ...readStorage<Partial<TasbihActiveState>>(KEYS.state, {}),
});
export const tasbihLogs = signal<Record<string, TasbihDayLog>>(
  readStorage<Record<string, TasbihDayLog>>(KEYS.logs, {})
);
export const tasbihPrefs = signal<TasbihPrefs>({
  ...DEFAULT_PREFS,
  ...readStorage<Partial<TasbihPrefs>>(KEYS.prefs, {}),
});

export const activeTasbihPreset = computed<TasbihPreset>(() => {
  return (
    tasbihPresets.value.find((p) => p.id === tasbihState.value.activePresetId) ??
    tasbihPresets.value[0] ??
    DEFAULT_TASBIH_PRESETS[0]
  );
});

export const activeTasbihCounter = computed<TasbihCounterState>(() => {
  const id = activeTasbihPreset.value.id;
  return tasbihState.value.counters[id] ?? { count: 0, rounds: 0, sessionTotal: 0 };
});

export const todayTasbihCount = computed(() => {
  const key = formatDateKey();
  return tasbihLogs.value[key]?.totalCount ?? 0;
});

export const allTimeTasbihCount = computed(() =>
  Object.values(tasbihLogs.value).reduce((sum, day) => sum + day.totalCount, 0)
);

function persistState(next: TasbihActiveState) {
  tasbihState.value = next;
  writeStorage(KEYS.state, next);
}

function recordTapLog(presetId: string, delta: number) {
  const key = formatDateKey();
  const prev = tasbihLogs.value[key] ?? {
    date: key,
    totalCount: 0,
    byPreset: {},
    updatedAt: Date.now(),
  };
  const nextTotal = Math.max(0, prev.totalCount + delta);
  const nextPreset = Math.max(0, (prev.byPreset[presetId] ?? 0) + delta);
  const updated: TasbihDayLog = {
    date: key,
    totalCount: nextTotal,
    byPreset: { ...prev.byPreset, [presetId]: nextPreset },
    updatedAt: Date.now(),
  };
  tasbihLogs.value = { ...tasbihLogs.value, [key]: updated };
  writeStorage(KEYS.logs, tasbihLogs.value);

  const uid = currentUid.value;
  if (uid) {
    putUserSubDoc(uid, 'tasbih_logs', key, updated).catch(() => {});
  }
}

export function performTasbihTap(): { reachedTarget: boolean; completedSequence: boolean } {
  const st = tasbihState.value;
  const prefs = tasbihPrefs.value;

  if (st.mode === 'bada-sholat') {
    const res = tapBadaSholat(st.badaSholat);
    if (res.nextState === st.badaSholat) return { reachedTarget: false, completedSequence: false };
    persistState({ ...st, badaSholat: res.nextState });
    recordTapLog('bada-sholat', 1);
    if (prefs.soundEnabled) playClickTone(res.stepFinished);
    if (prefs.hapticEnabled) triggerHaptic(res.stepFinished);
    if (res.completedAll) {
      showToast("Alhamdulillah, Dzikir Ba'da Sholat (100x) selesai.", { variant: 'success' });
    }
    return { reachedTarget: res.stepFinished, completedSequence: res.completedAll };
  }

  const preset = activeTasbihPreset.value;
  const cur = st.counters[preset.id] ?? { count: 0, rounds: 0, sessionTotal: 0 };
  const res = tapTasbih(cur, preset.target, prefs.autoNextRound);
  if (res.nextState === cur) return { reachedTarget: false, completedSequence: false };

  persistState({
    ...st,
    counters: { ...st.counters, [preset.id]: res.nextState },
  });
  recordTapLog(preset.id, 1);

  if (prefs.soundEnabled) playClickTone(res.reachedTarget);
  if (prefs.hapticEnabled) triggerHaptic(res.reachedTarget);
  return { reachedTarget: res.reachedTarget, completedSequence: false };
}

export function performTasbihUndo(): void {
  const st = tasbihState.value;
  if (st.mode === 'bada-sholat') {
    if (st.badaSholat.count <= 0) return;
    persistState({
      ...st,
      badaSholat: {
        ...st.badaSholat,
        count: st.badaSholat.count - 1,
        totalTaps: Math.max(0, st.badaSholat.totalTaps - 1),
        completed: false,
      },
    });
    recordTapLog('bada-sholat', -1);
    return;
  }

  const preset = activeTasbihPreset.value;
  const cur = st.counters[preset.id] ?? { count: 0, rounds: 0, sessionTotal: 0 };
  if (cur.count <= 0) return;
  persistState({
    ...st,
    counters: { ...st.counters, [preset.id]: undoTasbih(cur) },
  });
  recordTapLog(preset.id, -1);
}

export function resetActiveTasbih(resetRounds = false): void {
  const st = tasbihState.value;
  if (st.mode === 'bada-sholat') {
    persistState({ ...st, badaSholat: createBadaSholatState() });
    return;
  }
  const preset = activeTasbihPreset.value;
  const cur = st.counters[preset.id] ?? { count: 0, rounds: 0, sessionTotal: 0 };
  persistState({
    ...st,
    counters: {
      ...st.counters,
      [preset.id]: {
        count: 0,
        rounds: resetRounds ? 0 : cur.rounds,
        sessionTotal: resetRounds ? 0 : cur.sessionTotal,
      },
    },
  });
}

export function selectTasbihMode(mode: 'single' | 'bada-sholat'): void {
  persistState({ ...tasbihState.value, mode });
}

export function selectTasbihPreset(id: string): void {
  persistState({ ...tasbihState.value, mode: 'single', activePresetId: id });
}

export function setActivePresetTarget(rawTarget: number): void {
  const target = validateCustomTarget(rawTarget);
  const preset = activeTasbihPreset.value;
  const updated: TasbihPreset = { ...preset, target };
  tasbihPresets.value = tasbihPresets.value.map((p) => (p.id === preset.id ? updated : p));
  writeStorage(KEYS.presets, tasbihPresets.value);
  const uid = currentUid.value;
  if (uid) putUserSubDoc(uid, 'tasbih_presets', preset.id, updated).catch(() => {});
}

export function upsertCustomTasbihPreset(input: {
  id?: string;
  title: string;
  arabic?: string;
  latin?: string;
  meaning?: string;
  target: number;
}): TasbihPreset | null {
  const title = input.title.trim().slice(0, 60);
  if (!title) return null;
  const target = validateCustomTarget(input.target);
  const id = input.id || `custom_${Date.now().toString(36)}`;
  const item: TasbihPreset = {
    id,
    title,
    arabic: (input.arabic ?? '').trim(),
    latin: (input.latin ?? '').trim(),
    meaning: (input.meaning ?? '').trim(),
    target,
    isDefault: false,
  };
  const exists = tasbihPresets.value.some((p) => p.id === id);
  tasbihPresets.value = exists
    ? tasbihPresets.value.map((p) => (p.id === id ? item : p))
    : [...tasbihPresets.value, item];
  writeStorage(KEYS.presets, tasbihPresets.value);
  selectTasbihPreset(id);

  const uid = currentUid.value;
  if (uid) putUserSubDoc(uid, 'tasbih_presets', id, item).catch(() => {});
  showToast(exists ? 'Dzikir diperbarui.' : 'Dzikir custom ditambahkan.', { variant: 'success' });
  return item;
}

export function deleteTasbihPreset(id: string): void {
  if (tasbihPresets.value.length <= 1) return;
  tasbihPresets.value = tasbihPresets.value.filter((p) => p.id !== id);
  writeStorage(KEYS.presets, tasbihPresets.value);
  if (tasbihState.value.activePresetId === id) {
    selectTasbihPreset(tasbihPresets.value[0].id);
  }
  const uid = currentUid.value;
  if (uid) removeUserSubDoc(uid, 'tasbih_presets', id).catch(() => {});
  showToast('Dzikir dihapus.');
}

export function updateTasbihPrefs(patch: Partial<TasbihPrefs>): void {
  const next = { ...tasbihPrefs.value, ...patch };
  tasbihPrefs.value = next;
  writeStorage(KEYS.prefs, next);
}

let syncedUid: string | null = null;
let unsubs: Array<() => void> = [];

export function readLocalTasbihSnapshot() {
  return {
    tasbihPresets: readStorage<TasbihPreset[]>(KEYS.presets, [...DEFAULT_TASBIH_PRESETS]),
    tasbihLogs: readStorage<Record<string, TasbihDayLog>>(KEYS.logs, {}),
  };
}

export function applySyncedTasbih(
  presets: TasbihPreset[],
  logs: Record<string, TasbihDayLog>
): void {
  tasbihPresets.value = presets.length ? presets : [...DEFAULT_TASBIH_PRESETS];
  tasbihLogs.value = logs;
  writeStorage(KEYS.presets, tasbihPresets.value);
  writeStorage(KEYS.logs, tasbihLogs.value);
}

export function clearLocalTasbih(): void {
  removeStorage(KEYS.presets);
  removeStorage(KEYS.logs);
  removeStorage(KEYS.state);
  tasbihPresets.value = [...DEFAULT_TASBIH_PRESETS];
  tasbihLogs.value = {};
  tasbihState.value = {
    ...DEFAULT_STATE,
    badaSholat: createBadaSholatState(),
  };
}

export function bindTasbihSync(uid: string | null): void {
  if (syncedUid === uid) return;
  unsubs.forEach((u) => u());
  unsubs = [];
  syncedUid = uid;
  if (!uid) {
    tasbihPresets.value = readStorage<TasbihPreset[]>(KEYS.presets, [...DEFAULT_TASBIH_PRESETS]);
    tasbihLogs.value = readStorage<Record<string, TasbihDayLog>>(KEYS.logs, {});
    return;
  }

  unsubs.push(
    listenUserSubCol<TasbihPreset>(uid, 'tasbih_presets', (docs) => {
      if (!docs.length) return;
      const byId = new Map(DEFAULT_TASBIH_PRESETS.map((p) => [p.id, p]));
      for (const d of docs) byId.set(d.id, d);
      tasbihPresets.value = [...byId.values()];
      writeStorage(KEYS.presets, tasbihPresets.value);
    }),
    listenUserSubCol<TasbihDayLog>(uid, 'tasbih_logs', (docs) => {
      if (!docs.length) return;
      const merged = { ...tasbihLogs.value };
      for (const d of docs) {
        const key = d.date || d.id;
        if (!merged[key] || d.totalCount >= merged[key].totalCount) {
          merged[key] = d;
        }
      }
      tasbihLogs.value = merged;
      writeStorage(KEYS.logs, merged);
    })
  );
}
