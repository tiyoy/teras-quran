import { effect } from '@preact/signals';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';
import {
  commitUserBatchOps,
  getUserDocOnce,
  getUserSubColOnce,
  type BatchWriteOp,
} from '@/lib/firebase/firestore';
import {
  hasMeaningfulGuestData,
  mergeGuestWithCloud,
  type SyncUploadPlan,
  type UserDataSnapshot,
} from '@/lib/sync/merge';
import type { HifzItem } from '@/lib/hifz/sm2';
import type { TasbihPreset } from '@/data/tasbih-presets';
import { currentUid, initAuthListener, userProfile, type UserProfileDoc } from './auth';
import {
  applySyncedLastRead,
  applySyncedLibrary,
  bindLibrarySync,
  clearLocalLibrary,
  readLocalLibrarySnapshot,
  type AyahCollection,
  type AyahNote,
  type FavoriteAyah,
} from './library';
import {
  applySyncedProgress,
  applySyncedReadingGoal,
  bindProgressSync,
  clearLocalProgress,
  readLocalProgressSnapshot,
  recordReadAyahs,
  type KhatamCycle,
  type ReadingDayLog,
} from './progress';
import { applySyncedHifz, bindHifzSync, clearLocalHifz, readLocalHifzSnapshot } from './hifz';
import { bindKhatamanListSync, clearLocalKhataman } from './khataman';
import { bindNotificationsSync, clearLocalNotifications } from './notifications';
import {
  applySyncedTasbih,
  bindTasbihSync,
  clearLocalTasbih,
  readLocalTasbihSnapshot,
  type TasbihDayLog,
} from './tasbih';
import { applySyncedReminder, clearLocalReminder, readLocalReminderSnapshot } from './reminders';
import { onAyahAudioCompleted } from './audio-player';
import { initPwaListener } from './pwa';
import { initOfflineSync } from './offline';
import { showToast } from './toast';

const SYNC_OWNER_KEY = 'tq:sync:ownerUid';

let started = false;
let unsubKhataman: (() => void) | null = null;
let unsubNotifs: (() => void) | null = null;
let syncSessionSeq = 0;
let activeBoundUid: string | null = null;
let migratingUid: string | null = null;
let retryMigrationUid: string | null = null;

function collectLocalGuestSnapshot(): UserDataSnapshot {
  const lib = readLocalLibrarySnapshot();
  const prog = readLocalProgressSnapshot();
  const tasbih = readLocalTasbihSnapshot();
  return {
    lastRead: lib.lastRead,
    readingGoal: prog.readingGoal,
    reminder: readLocalReminderSnapshot(),
    favorites: lib.favorites,
    savedSurahs: lib.savedSurahs,
    notes: lib.notes,
    collections: lib.collections,
    readingDays: prog.readingDays,
    khatamCycles: prog.khatamCycles,
    hifzItems: readLocalHifzSnapshot(),
    tasbihPresets: tasbih.tasbihPresets,
    tasbihLogs: tasbih.tasbihLogs,
  };
}

async function fetchCloudSnapshot(uid: string): Promise<UserDataSnapshot> {
  const [
    profileDoc,
    favDocs,
    savedDocs,
    noteDocs,
    colDocs,
    dayDocs,
    khatamDocs,
    hifzDocs,
    presetDocs,
    tasbihLogDocs,
  ] = await Promise.all([
    getUserDocOnce<UserProfileDoc>(uid),
    getUserSubColOnce<FavoriteAyah>(uid, 'favorites'),
    getUserSubColOnce<{ surahId: number }>(uid, 'saved_surahs'),
    getUserSubColOnce<AyahNote>(uid, 'notes'),
    getUserSubColOnce<Omit<AyahCollection, 'id'>>(uid, 'collections'),
    getUserSubColOnce<ReadingDayLog>(uid, 'reading_days'),
    getUserSubColOnce<Omit<KhatamCycle, 'id'>>(uid, 'khatam'),
    getUserSubColOnce<Omit<HifzItem, 'id'>>(uid, 'hafalan'),
    getUserSubColOnce<TasbihPreset>(uid, 'tasbih_presets'),
    getUserSubColOnce<TasbihDayLog>(uid, 'tasbih_logs'),
  ]);

  const readingDays: Record<string, ReadingDayLog> = {};
  for (const d of dayDocs) {
    readingDays[d.date || d.id] = d;
  }

  const tasbihLogs: Record<string, TasbihDayLog> = {};
  for (const l of tasbihLogDocs) {
    tasbihLogs[l.date || l.id] = l;
  }

  return {
    lastRead: profileDoc?.lastRead ?? null,
    readingGoal: profileDoc?.readingGoal ?? null,
    reminder: profileDoc?.reminder ?? null,
    favorites: favDocs,
    savedSurahs: savedDocs.map((d) => Number(d.surahId || d.id)).filter(Number.isFinite),
    notes: noteDocs,
    collections: colDocs,
    readingDays,
    khatamCycles: khatamDocs,
    hifzItems: hifzDocs,
    tasbihPresets: presetDocs,
    tasbihLogs,
  };
}

function buildBatchOpsFromPlan(plan: SyncUploadPlan): BatchWriteOp[] {
  const ops: BatchWriteOp[] = [];
  if (Object.keys(plan.profilePatch).length > 0) {
    ops.push({
      type: 'set',
      data: { ...plan.profilePatch, updatedAt: Date.now() },
    });
  }
  for (const f of plan.favorites) {
    ops.push({ type: 'set', sub: 'favorites', id: String(f.ayaId), data: f });
  }
  for (const surahId of plan.savedSurahs) {
    ops.push({
      type: 'set',
      sub: 'saved_surahs',
      id: String(surahId),
      data: { surahId, createdAt: Date.now() },
    });
  }
  for (const n of plan.notes) {
    ops.push({ type: 'set', sub: 'notes', id: String(n.ayaId), data: n });
  }
  for (const c of plan.collections) {
    ops.push({ type: 'set', sub: 'collections', id: c.id, data: c });
  }
  for (const d of plan.readingDays) {
    ops.push({ type: 'set', sub: 'reading_days', id: d.date, data: d });
  }
  for (const k of plan.khatamCycles) {
    ops.push({ type: 'set', sub: 'khatam', id: k.id, data: k });
  }
  for (const h of plan.hifzItems) {
    ops.push({ type: 'set', sub: 'hafalan', id: h.id, data: h });
  }
  for (const rid of plan.removeHifzIds) {
    ops.push({ type: 'delete', sub: 'hafalan', id: rid });
  }
  for (const p of plan.tasbihPresets) {
    ops.push({ type: 'set', sub: 'tasbih_presets', id: p.id, data: p });
  }
  for (const l of plan.tasbihLogs) {
    ops.push({ type: 'set', sub: 'tasbih_logs', id: l.date, data: l });
  }
  return ops;
}

function applyMergedSnapshotLocally(merged: UserDataSnapshot): void {
  applySyncedLibrary({
    lastRead: merged.lastRead,
    favorites: merged.favorites,
    savedSurahs: merged.savedSurahs,
    notes: merged.notes,
    collections: merged.collections,
  });
  applySyncedProgress({
    readingGoal: merged.readingGoal,
    readingDays: merged.readingDays,
    khatamCycles: merged.khatamCycles,
  });
  applySyncedHifz(merged.hifzItems);
  applySyncedTasbih(merged.tasbihPresets, merged.tasbihLogs);
  if (merged.reminder) {
    applySyncedReminder(merged.reminder);
  }
}

function attachRealtimeListeners(uid: string | null): void {
  bindLibrarySync(uid);
  bindProgressSync(uid);
  bindHifzSync(uid);
  bindTasbihSync(uid);

  unsubKhataman?.();
  unsubKhataman = bindKhatamanListSync(uid);

  unsubNotifs?.();
  unsubNotifs = bindNotificationsSync(uid);
}

async function runGuestMigration(
  uid: string,
  local: UserDataSnapshot,
  seq: number
): Promise<void> {
  migratingUid = uid;
  try {
    const cloud = await fetchCloudSnapshot(uid);
    if (seq !== syncSessionSeq || currentUid.value !== uid) return;

    const result = mergeGuestWithCloud(local, cloud);
    applyMergedSnapshotLocally(result.merged);

    const ops = buildBatchOpsFromPlan(result.toUpload);
    if (ops.length > 0) {
      await commitUserBatchOps(uid, ops);
    }

    if (seq !== syncSessionSeq || currentUid.value !== uid) return;

    writeStorage(SYNC_OWNER_KEY, uid);
    migratingUid = null;
    retryMigrationUid = null;
    activeBoundUid = uid;
    attachRealtimeListeners(uid);

    if (result.uploadCount > 0) {
      showToast('Data bacaan lokal berhasil disinkronkan ke akun.', { variant: 'success' });
    }
  } catch {
    if (seq !== syncSessionSeq || currentUid.value !== uid) return;
    migratingUid = null;
    // Keep local guest data intact & retry automatically once connection returns
    retryMigrationUid = uid;
  }
}

function handleUidTransition(uid: string | null): void {
  const seq = ++syncSessionSeq;

  if (!uid) {
    migratingUid = null;
    retryMigrationUid = null;
    activeBoundUid = null;
    attachRealtimeListeners(null);
    return;
  }

  if (uid === activeBoundUid && migratingUid === null) return;

  const ownerUid = readStorage<string | null>(SYNC_OWNER_KEY, null);

  // Different account on the same device: isolate local caches before loading the new account
  if (ownerUid && ownerUid !== uid) {
    clearLocalUserSessionData();
    writeStorage(SYNC_OWNER_KEY, uid);
    activeBoundUid = uid;
    attachRealtimeListeners(uid);
    return;
  }

  // Same account returning / reloading: bind realtime Firestore listeners right away
  if (ownerUid === uid) {
    activeBoundUid = uid;
    attachRealtimeListeners(uid);
    return;
  }

  // Unclaimed guest data -> auto-sync & merge non-destructively into cloud BEFORE listening
  const local = collectLocalGuestSnapshot();
  if (!hasMeaningfulGuestData(local)) {
    writeStorage(SYNC_OWNER_KEY, uid);
    activeBoundUid = uid;
    attachRealtimeListeners(uid);
    return;
  }

  void runGuestMigration(uid, local, seq);
}

/**
 * Clear personal user-scoped caches on explicit logout or account switch
 * while preserving device preferences (theme, font sizes, reciter, offline Quran cache).
 */
export function clearLocalUserSessionData(): void {
  removeStorage(SYNC_OWNER_KEY);
  clearLocalLibrary();
  clearLocalProgress();
  clearLocalHifz();
  clearLocalTasbih();
  clearLocalReminder();
  clearLocalKhataman();
  clearLocalNotifications();
}

export function bootstrapAppStores(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  initAuthListener();
  initPwaListener();

  // Register Service Worker quietly & start automatic full-app offline sync
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => initOfflineSync())
      .catch(() => {});
  } else {
    initOfflineSync();
  }

  // Record ayahs read when audio finishes an ayah
  onAyahAudioCompleted((ayah) => {
    recordReadAyahs([ayah.i]);
  });

  // Retry guest-to-cloud sync if login happened while connection was temporarily offline
  window.addEventListener('online', () => {
    const uid = retryMigrationUid;
    if (uid && currentUid.value === uid && migratingUid === null) {
      const ownerUid = readStorage<string | null>(SYNC_OWNER_KEY, null);
      if (!ownerUid) {
        const local = collectLocalGuestSnapshot();
        const seq = ++syncSessionSeq;
        void runGuestMigration(uid, local, seq);
      }
    }
  });

  // Bind Firestore sync whenever authenticated UID changes
  effect(() => {
    handleUidTransition(currentUid.value);
  });

  // Apply profile synced fields (lastRead, readingGoal, reminder) once ownership is synced
  effect(() => {
    const prof = userProfile.value;
    const uid = currentUid.value;
    if (!prof || !uid || migratingUid === uid) return;
    if (readStorage<string | null>(SYNC_OWNER_KEY, null) !== uid) return;
    if (prof.lastRead) applySyncedLastRead(prof.lastRead);
    if (prof.readingGoal !== undefined) applySyncedReadingGoal(prof.readingGoal);
    if (prof.reminder) applySyncedReminder(prof.reminder);
  });
}
