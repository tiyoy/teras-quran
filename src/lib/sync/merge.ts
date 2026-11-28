import { mergeMasks } from '@/lib/quran/ayah-mask';
import { TOTAL_AYAHS } from '@/lib/quran/meta';
import { mergeHifzRange, type HifzItem } from '@/lib/hifz/sm2';
import { DEFAULT_TASBIH_PRESETS, type TasbihPreset } from '@/data/tasbih-presets';
import type {
  AyahCollection,
  AyahNote,
  FavoriteAyah,
  LastReadEntry,
} from '@/stores/library';
import type { KhatamCycle, ReadingDayLog, ReadingGoal } from '@/stores/progress';
import type { TasbihDayLog } from '@/stores/tasbih';
import type { ReminderSettings } from '@/stores/reminders';

export interface UserDataSnapshot {
  lastRead: LastReadEntry | null;
  readingGoal: ReadingGoal | null;
  reminder: ReminderSettings | null;
  favorites: FavoriteAyah[];
  savedSurahs: number[];
  notes: AyahNote[];
  collections: AyahCollection[];
  readingDays: Record<string, ReadingDayLog>;
  khatamCycles: KhatamCycle[];
  hifzItems: HifzItem[];
  tasbihPresets: TasbihPreset[];
  tasbihLogs: Record<string, TasbihDayLog>;
}

export interface SyncProfilePatch {
  lastRead?: LastReadEntry;
  readingGoal?: ReadingGoal | null;
  reminder?: ReminderSettings;
}

export interface SyncUploadPlan {
  profilePatch: SyncProfilePatch;
  favorites: FavoriteAyah[];
  savedSurahs: number[];
  notes: AyahNote[];
  collections: AyahCollection[];
  readingDays: ReadingDayLog[];
  khatamCycles: KhatamCycle[];
  hifzItems: HifzItem[];
  removeHifzIds: string[];
  tasbihPresets: TasbihPreset[];
  tasbihLogs: TasbihDayLog[];
}

export interface MergedSyncResult {
  merged: UserDataSnapshot;
  toUpload: SyncUploadPlan;
  uploadCount: number;
}

function goalToAyahTarget(goal: ReadingGoal | null): number {
  if (!goal) return 0;
  if (goal.unit === 'ayah') return goal.amount;
  if (goal.unit === 'page') return Math.round(goal.amount * 10.3);
  return Math.round(goal.amount * 208);
}

function isCustomOrModifiedPreset(preset: TasbihPreset): boolean {
  const def = DEFAULT_TASBIH_PRESETS.find((p) => p.id === preset.id);
  if (!def) return true;
  return (
    preset.target !== def.target ||
    preset.title !== def.title ||
    preset.arabic !== def.arabic ||
    preset.latin !== def.latin ||
    preset.meaning !== def.meaning
  );
}

export function hasMeaningfulGuestData(local: UserDataSnapshot): boolean {
  if (local.lastRead) return true;
  if (local.readingGoal) return true;
  if (local.reminder?.enabled) return true;
  if (local.favorites.length > 0) return true;
  if (local.savedSurahs.length > 0) return true;
  if (local.notes.length > 0) return true;
  if (local.collections.length > 0) return true;
  if (Object.values(local.readingDays).some((d) => d.ayahCount > 0 || d.ayahIds.length > 0)) {
    return true;
  }
  if (local.khatamCycles.some((k) => k.readCount > 0)) return true;
  if (local.hifzItems.length > 0) return true;
  if (local.tasbihPresets.some(isCustomOrModifiedPreset)) return true;
  if (Object.values(local.tasbihLogs).some((d) => d.totalCount > 0)) return true;
  return false;
}

export function mergeGuestWithCloud(
  local: UserDataSnapshot,
  cloud: UserDataSnapshot
): MergedSyncResult {
  const profilePatch: SyncProfilePatch = {};
  let uploadCount = 0;

  // 1. lastRead: newest updatedAt wins
  let mergedLastRead: LastReadEntry | null = cloud.lastRead;
  if (local.lastRead) {
    if (!cloud.lastRead || local.lastRead.updatedAt > cloud.lastRead.updatedAt) {
      mergedLastRead = local.lastRead;
      profilePatch.lastRead = local.lastRead;
      uploadCount += 1;
    }
  }

  // 2. readingGoal: preserve cloud goal if already configured, else lift guest goal
  let mergedReadingGoal: ReadingGoal | null = cloud.readingGoal;
  if (!cloud.readingGoal && local.readingGoal) {
    mergedReadingGoal = local.readingGoal;
    profilePatch.readingGoal = local.readingGoal;
    uploadCount += 1;
  }

  // 3. reminder: preserve cloud reminder if present, else lift enabled guest reminder
  let mergedReminder: ReminderSettings | null = cloud.reminder;
  if (!cloud.reminder && local.reminder?.enabled) {
    mergedReminder = local.reminder;
    profilePatch.reminder = local.reminder;
    uploadCount += 1;
  } else if (!mergedReminder && local.reminder) {
    mergedReminder = local.reminder;
  }

  // 4. favorites: union by ayaId
  const favMap = new Map<number, FavoriteAyah>();
  for (const item of cloud.favorites) favMap.set(item.ayaId, item);
  const uploadFavorites: FavoriteAyah[] = [];
  for (const item of local.favorites) {
    if (!favMap.has(item.ayaId)) {
      favMap.set(item.ayaId, item);
      uploadFavorites.push(item);
      uploadCount += 1;
    }
  }
  const mergedFavorites = [...favMap.values()].sort((a, b) => b.createdAt - a.createdAt);

  // 5. savedSurahs: union sorted ascending
  const savedSet = new Set<number>(cloud.savedSurahs);
  const uploadSavedSurahs: number[] = [];
  for (const sid of local.savedSurahs) {
    if (!savedSet.has(sid)) {
      savedSet.add(sid);
      uploadSavedSurahs.push(sid);
      uploadCount += 1;
    }
  }
  const mergedSavedSurahs = [...savedSet].sort((a, b) => a - b);

  // 6. notes: merge by ayaId, newest updatedAt wins
  const noteMap = new Map<number, AyahNote>();
  for (const n of cloud.notes) noteMap.set(n.ayaId, n);
  const uploadNotes: AyahNote[] = [];
  for (const ln of local.notes) {
    const cn = noteMap.get(ln.ayaId);
    if (!cn || ln.updatedAt > cn.updatedAt) {
      noteMap.set(ln.ayaId, ln);
      uploadNotes.push(ln);
      uploadCount += 1;
    }
  }
  const mergedNotes = [...noteMap.values()].sort((a, b) => b.updatedAt - a.updatedAt);

  // 7. collections: merge by id, union ayahIds (max 200)
  const colMap = new Map<string, AyahCollection>();
  for (const c of cloud.collections) colMap.set(c.id, c);
  const uploadCollections: AyahCollection[] = [];
  for (const lc of local.collections) {
    const cc = colMap.get(lc.id);
    if (!cc) {
      colMap.set(lc.id, lc);
      uploadCollections.push(lc);
      uploadCount += 1;
    } else {
      const unionIds = [...new Set([...cc.ayahIds, ...lc.ayahIds])].slice(0, 200);
      const idsChanged = unionIds.length !== cc.ayahIds.length;
      const localNewer = lc.updatedAt > cc.updatedAt;
      if (idsChanged || localNewer) {
        const mergedCol: AyahCollection = {
          id: cc.id,
          name: localNewer ? lc.name : cc.name,
          ayahIds: unionIds,
          createdAt: Math.min(cc.createdAt, lc.createdAt),
          updatedAt: Math.max(cc.updatedAt, lc.updatedAt),
        };
        colMap.set(cc.id, mergedCol);
        uploadCollections.push(mergedCol);
        uploadCount += 1;
      }
    }
  }
  const mergedCollections = [...colMap.values()].sort((a, b) => b.updatedAt - a.updatedAt);

  // 8. readingDays: union ayahIds per date and recompute ayahCount / goalMet
  const targetAyahs = goalToAyahTarget(mergedReadingGoal);
  const mergedDays: Record<string, ReadingDayLog> = { ...cloud.readingDays };
  const uploadReadingDays: ReadingDayLog[] = [];
  for (const [dateKey, ld] of Object.entries(local.readingDays)) {
    const date = ld.date || dateKey;
    if (ld.ayahIds.length === 0 && ld.ayahCount === 0) continue;
    const cd = mergedDays[date];
    if (!cd) {
      const cleanIds = [...new Set(ld.ayahIds)];
      const ayahCount = Math.max(cleanIds.length, ld.ayahCount);
      const next: ReadingDayLog = {
        date,
        ayahIds: cleanIds,
        ayahCount,
        goalMet: ld.goalMet || (targetAyahs > 0 && ayahCount >= targetAyahs),
        updatedAt: ld.updatedAt || Date.now(),
      };
      mergedDays[date] = next;
      uploadReadingDays.push(next);
      uploadCount += 1;
    } else {
      const mergedIds = [...new Set([...cd.ayahIds, ...ld.ayahIds])];
      const ayahCount = Math.max(mergedIds.length, cd.ayahCount, ld.ayahCount);
      const goalMet = cd.goalMet || ld.goalMet || (targetAyahs > 0 && ayahCount >= targetAyahs);
      if (
        mergedIds.length > cd.ayahIds.length ||
        ayahCount > cd.ayahCount ||
        (goalMet && !cd.goalMet)
      ) {
        const next: ReadingDayLog = {
          date,
          ayahIds: mergedIds,
          ayahCount,
          goalMet,
          updatedAt: Math.max(cd.updatedAt, ld.updatedAt),
        };
        mergedDays[date] = next;
        uploadReadingDays.push(next);
        uploadCount += 1;
      }
    }
  }

  // 9. khatamCycles: merge active bitmasks via bitwise OR, keep historical cycles
  const uploadKhatam: KhatamCycle[] = [];
  let mergedKhatam: KhatamCycle[];
  const meaningfulLocalKhatam = local.khatamCycles.filter((k) => k.readCount > 0);

  if (cloud.khatamCycles.length === 0) {
    if (meaningfulLocalKhatam.length > 0) {
      const hasActive = meaningfulLocalKhatam.some((k) => k.active);
      mergedKhatam = meaningfulLocalKhatam
        .map((k, idx) => ({ ...k, active: hasActive ? k.active : idx === 0 }))
        .sort((a, b) => b.startedAt - a.startedAt);
      uploadKhatam.push(...mergedKhatam);
      uploadCount += mergedKhatam.length;
    } else {
      mergedKhatam = local.khatamCycles;
    }
  } else {
    const khatamMap = new Map<string, KhatamCycle>(cloud.khatamCycles.map((k) => [k.id, { ...k }]));
    const cloudActive =
      [...khatamMap.values()].find((k) => k.active) ?? [...khatamMap.values()][0];
    const localActive =
      local.khatamCycles.find((k) => k.active) ?? local.khatamCycles[0] ?? null;

    if (cloudActive && localActive && localActive.readCount > 0) {
      const maskRes = mergeMasks(cloudActive.readMask, localActive.readMask);
      if (maskRes.changed) {
        const updatedActive: KhatamCycle = {
          ...cloudActive,
          readMask: maskRes.readMask,
          readCount: maskRes.readCount,
          startedAt: Math.min(cloudActive.startedAt, localActive.startedAt),
          completedAt:
            maskRes.readCount >= TOTAL_AYAHS
              ? cloudActive.completedAt ?? localActive.completedAt ?? Date.now()
              : null,
        };
        khatamMap.set(updatedActive.id, updatedActive);
        uploadKhatam.push(updatedActive);
        uploadCount += 1;
      }
    }

    for (const lk of meaningfulLocalKhatam) {
      if (lk.id === localActive?.id) continue;
      if (!khatamMap.has(lk.id)) {
        const archived: KhatamCycle = { ...lk, active: false };
        khatamMap.set(archived.id, archived);
        uploadKhatam.push(archived);
        uploadCount += 1;
      }
    }

    mergedKhatam = [...khatamMap.values()].sort((a, b) => b.startedAt - a.startedAt);
  }

  // 10. hifzItems: non-destructive merge (same-id newest review wins, disjoint preserved, overlap merged)
  let hifzList: HifzItem[] = [...cloud.hifzItems];
  const uploadHifzMap = new Map<string, HifzItem>();
  const removeHifzSet = new Set<string>();

  for (const li of local.hifzItems) {
    const sameIdIdx = hifzList.findIndex((c) => c.id === li.id);
    if (sameIdIdx !== -1) {
      const ci = hifzList[sameIdIdx];
      const localBetter =
        li.reviewCount > ci.reviewCount ||
        (li.reviewCount === ci.reviewCount && (li.lastReviewedAt ?? 0) > (ci.lastReviewedAt ?? 0));
      if (localBetter) {
        hifzList[sameIdIdx] = li;
        uploadHifzMap.set(li.id, li);
      }
      continue;
    }

    const plan = mergeHifzRange(
      hifzList,
      { surahId: li.surahId, fromAyah: li.fromAyah, toAyah: li.toAyah },
      li.memorizedAt,
      li.dueDate
    );
    if (!plan.target) continue;

    if (plan.target.id === null) {
      // Completely disjoint range — preserve original local SM-2 metadata intact
      hifzList.push(li);
      uploadHifzMap.set(li.id, li);
    } else {
      const mergedItem: HifzItem = { ...plan.target.data, id: plan.target.id };
      hifzList = hifzList.filter(
        (it) => it.id !== mergedItem.id && !plan.remove.includes(it.id)
      );
      hifzList.push(mergedItem);
      uploadHifzMap.set(mergedItem.id, mergedItem);
      for (const rid of plan.remove) {
        uploadHifzMap.delete(rid);
        removeHifzSet.add(rid);
      }
    }
  }
  const uploadHifzItems = [...uploadHifzMap.values()];
  const removeHifzIds = [...removeHifzSet];
  uploadCount += uploadHifzItems.length;

  // 11. tasbihPresets: upload local custom or modified presets not yet in cloud
  const cloudPresetMap = new Map<string, TasbihPreset>(cloud.tasbihPresets.map((p) => [p.id, p]));
  const mergedPresetMap = new Map<string, TasbihPreset>(
    DEFAULT_TASBIH_PRESETS.map((p) => [p.id, p])
  );
  for (const cp of cloud.tasbihPresets) mergedPresetMap.set(cp.id, cp);

  const uploadTasbihPresets: TasbihPreset[] = [];
  for (const lp of local.tasbihPresets) {
    if (isCustomOrModifiedPreset(lp) && !cloudPresetMap.has(lp.id)) {
      mergedPresetMap.set(lp.id, lp);
      uploadTasbihPresets.push(lp);
      uploadCount += 1;
    }
  }
  const mergedTasbihPresets = [...mergedPresetMap.values()];

  // 12. tasbihLogs: merge per date taking max per preset (idempotent, no double counting)
  const mergedTasbihLogs: Record<string, TasbihDayLog> = { ...cloud.tasbihLogs };
  const uploadTasbihLogs: TasbihDayLog[] = [];
  for (const [dateKey, ll] of Object.entries(local.tasbihLogs)) {
    const date = ll.date || dateKey;
    if (ll.totalCount <= 0) continue;
    const cl = mergedTasbihLogs[date];
    if (!cl) {
      const next: TasbihDayLog = {
        date,
        totalCount: ll.totalCount,
        byPreset: { ...ll.byPreset },
        updatedAt: ll.updatedAt || Date.now(),
      };
      mergedTasbihLogs[date] = next;
      uploadTasbihLogs.push(next);
      uploadCount += 1;
    } else {
      const mergedByPreset: Record<string, number> = { ...cl.byPreset };
      let presetChanged = false;
      for (const [pid, count] of Object.entries(ll.byPreset)) {
        const prev = mergedByPreset[pid] ?? 0;
        if (count > prev) {
          mergedByPreset[pid] = count;
          presetChanged = true;
        }
      }
      const presetSum = Object.values(mergedByPreset).reduce((sum, n) => sum + n, 0);
      const totalCount = Math.max(cl.totalCount, ll.totalCount, presetSum);
      if (presetChanged || totalCount > cl.totalCount) {
        const next: TasbihDayLog = {
          date,
          totalCount,
          byPreset: mergedByPreset,
          updatedAt: Math.max(cl.updatedAt, ll.updatedAt),
        };
        mergedTasbihLogs[date] = next;
        uploadTasbihLogs.push(next);
        uploadCount += 1;
      }
    }
  }

  return {
    merged: {
      lastRead: mergedLastRead,
      readingGoal: mergedReadingGoal,
      reminder: mergedReminder,
      favorites: mergedFavorites,
      savedSurahs: mergedSavedSurahs,
      notes: mergedNotes,
      collections: mergedCollections,
      readingDays: mergedDays,
      khatamCycles: mergedKhatam,
      hifzItems: hifzList,
      tasbihPresets: mergedTasbihPresets,
      tasbihLogs: mergedTasbihLogs,
    },
    toUpload: {
      profilePatch,
      favorites: uploadFavorites,
      savedSurahs: uploadSavedSurahs,
      notes: uploadNotes,
      collections: uploadCollections,
      readingDays: uploadReadingDays,
      khatamCycles: uploadKhatam,
      hifzItems: uploadHifzItems,
      removeHifzIds,
      tasbihPresets: uploadTasbihPresets,
      tasbihLogs: uploadTasbihLogs,
    },
    uploadCount,
  };
}
