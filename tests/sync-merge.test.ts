import { describe, expect, it } from 'vitest';
import { createMask, encodeMask, hasBit, markAyahs, mergeMasks, decodeMask } from '@/lib/quran/ayah-mask';
import {
  hasMeaningfulGuestData,
  mergeGuestWithCloud,
  type UserDataSnapshot,
} from '@/lib/sync/merge';
import { DEFAULT_TASBIH_PRESETS } from '@/data/tasbih-presets';

function emptySnapshot(): UserDataSnapshot {
  return {
    lastRead: null,
    readingGoal: null,
    reminder: null,
    favorites: [],
    savedSurahs: [],
    notes: [],
    collections: [],
    readingDays: {},
    khatamCycles: [],
    hifzItems: [],
    tasbihPresets: [...DEFAULT_TASBIH_PRESETS],
    tasbihLogs: {},
  };
}

describe('mergeMasks', () => {
  it('combines two disjoint bitmasks with bitwise OR and reports change', () => {
    const a = markAyahs(encodeMask(createMask()), [1, 2, 3]);
    const b = markAyahs(encodeMask(createMask()), [3, 4, 5]);
    const merged = mergeMasks(a.readMask, b.readMask);
    expect(merged.changed).toBe(true);
    expect(merged.readCount).toBe(5);
    const decoded = decodeMask(merged.readMask);
    for (const id of [1, 2, 3, 4, 5]) {
      expect(hasBit(decoded, id)).toBe(true);
    }
  });

  it('reports changed=false when second mask adds no new bits', () => {
    const a = markAyahs(encodeMask(createMask()), [1, 2, 3]);
    const b = markAyahs(encodeMask(createMask()), [1, 2]);
    const merged = mergeMasks(a.readMask, b.readMask);
    expect(merged.changed).toBe(false);
    expect(merged.readCount).toBe(3);
  });
});

describe('hasMeaningfulGuestData', () => {
  it('returns false for empty/default guest snapshot', () => {
    const snap = emptySnapshot();
    snap.khatamCycles = [
      {
        id: 'k_empty',
        readMask: encodeMask(createMask()),
        readCount: 0,
        startedAt: 1000,
        completedAt: null,
        active: true,
      },
    ];
    snap.reminder = {
      enabled: false,
      time: '19:30',
      days: [0, 1, 2, 3, 4, 5, 6],
      timezone: 'Asia/Jakarta',
      skipIfGoalMet: true,
      includeHifz: true,
    };
    expect(hasMeaningfulGuestData(snap)).toBe(false);
  });

  it('detects guest reading days, favorites, custom tasbih, or modified target', () => {
    const snap1 = emptySnapshot();
    snap1.favorites = [{ ayaId: 1, surahId: 1, ayahNumber: 1, createdAt: 100 }];
    expect(hasMeaningfulGuestData(snap1)).toBe(true);

    const snap2 = emptySnapshot();
    snap2.tasbihPresets = [
      { ...DEFAULT_TASBIH_PRESETS[0], target: 99 },
      ...DEFAULT_TASBIH_PRESETS.slice(1),
    ];
    expect(hasMeaningfulGuestData(snap2)).toBe(true);

    const snap3 = emptySnapshot();
    snap3.tasbihLogs = {
      '2026-11-28': { date: '2026-11-28', totalCount: 33, byPreset: { subhanallah: 33 }, updatedAt: 1 },
    };
    expect(hasMeaningfulGuestData(snap3)).toBe(true);
  });
});

describe('mergeGuestWithCloud', () => {
  it('uploads all guest localStorage data into a brand-new empty cloud account', () => {
    const local = emptySnapshot();
    const maskRes = markAyahs(encodeMask(createMask()), [1, 2, 3, 4, 5, 6, 7]);
    local.lastRead = {
      surahId: 1,
      ayahNumber: 7,
      globalAyahId: 7,
      page: 1,
      juz: 1,
      updatedAt: 5000,
    };
    local.readingGoal = { unit: 'ayah', amount: 10, targetDate: null };
    local.reminder = {
      enabled: true,
      time: '05:30',
      days: [1, 2, 3, 4, 5],
      timezone: 'Asia/Jakarta',
      skipIfGoalMet: true,
      includeHifz: true,
    };
    local.favorites = [{ ayaId: 7, surahId: 1, ayahNumber: 7, createdAt: 4000 }];
    local.savedSurahs = [1, 36];
    local.notes = [
      { ayaId: 7, surahId: 1, ayahNumber: 7, text: 'Catatan lokal', createdAt: 3000, updatedAt: 3500 },
    ];
    local.collections = [
      { id: 'col_1', name: 'Doa Harian', ayahIds: [7, 255], createdAt: 2000, updatedAt: 2500 },
    ];
    local.readingDays = {
      '2026-11-28': {
        date: '2026-11-28',
        ayahIds: [1, 2, 3, 4, 5, 6, 7],
        ayahCount: 7,
        goalMet: false,
        updatedAt: 5000,
      },
    };
    local.khatamCycles = [
      {
        id: 'k_guest',
        readMask: maskRes.readMask,
        readCount: 7,
        startedAt: 1000,
        completedAt: null,
        active: true,
      },
    ];
    local.hifzItems = [
      {
        id: 'h_1',
        surahId: 1,
        fromAyah: 1,
        toAyah: 7,
        ayahCount: 7,
        memorizedAt: 1000,
        ease: 2.5,
        interval: 3,
        repetitions: 2,
        dueDate: '2026-12-01',
        lastReviewedAt: 2000,
        lastRating: 4,
        reviewCount: 2,
      },
    ];
    local.tasbihPresets = [
      ...DEFAULT_TASBIH_PRESETS,
      {
        id: 'custom_shalawat',
        title: 'Shalawat',
        arabic: 'اللهم صل على محمد',
        latin: 'Allahumma shalli ala Muhammad',
        meaning: '',
        target: 100,
        isDefault: false,
      },
    ];
    local.tasbihLogs = {
      '2026-11-28': {
        date: '2026-11-28',
        totalCount: 33,
        byPreset: { subhanallah: 33 },
        updatedAt: 4000,
      },
    };

    const cloud = emptySnapshot();
    cloud.tasbihPresets = [];

    const res = mergeGuestWithCloud(local, cloud);

    expect(res.uploadCount).toBeGreaterThanOrEqual(11);
    expect(res.toUpload.profilePatch.lastRead?.globalAyahId).toBe(7);
    expect(res.toUpload.profilePatch.readingGoal?.amount).toBe(10);
    expect(res.toUpload.profilePatch.reminder?.enabled).toBe(true);
    expect(res.toUpload.favorites).toHaveLength(1);
    expect(res.toUpload.savedSurahs).toEqual([1, 36]);
    expect(res.toUpload.notes).toHaveLength(1);
    expect(res.toUpload.collections).toHaveLength(1);
    expect(res.toUpload.readingDays).toHaveLength(1);
    expect(res.toUpload.khatamCycles).toHaveLength(1);
    expect(res.toUpload.khatamCycles[0].readCount).toBe(7);
    expect(res.toUpload.hifzItems).toHaveLength(1);
    expect(res.toUpload.tasbihPresets).toHaveLength(1);
    expect(res.toUpload.tasbihPresets[0].id).toBe('custom_shalawat');
    expect(res.toUpload.tasbihLogs).toHaveLength(1);

    // Running merge a second time against already-synced cloud is idempotent (0 uploads)
    const secondPass = mergeGuestWithCloud(local, res.merged);
    expect(secondPass.uploadCount).toBe(0);
  });

  it('merges guest data non-destructively with existing cloud data from another device', () => {
    const localMask = markAyahs(encodeMask(createMask()), [1, 2, 3, 4, 5]);
    const cloudMask = markAyahs(encodeMask(createMask()), [4, 5, 6, 7, 8]);

    const local = emptySnapshot();
    local.lastRead = {
      surahId: 2,
      ayahNumber: 15,
      globalAyahId: 22,
      page: 3,
      juz: 1,
      updatedAt: 9000,
    };
    local.favorites = [
      { ayaId: 10, surahId: 2, ayahNumber: 3, createdAt: 1000 },
      { ayaId: 20, surahId: 2, ayahNumber: 13, createdAt: 2000 },
    ];
    local.savedSurahs = [1, 67];
    local.notes = [
      { ayaId: 10, surahId: 2, ayahNumber: 3, text: 'Revisi lokal terbaru', createdAt: 100, updatedAt: 8000 },
    ];
    local.readingDays = {
      '2026-11-28': {
        date: '2026-11-28',
        ayahIds: [1, 2, 3, 4, 5],
        ayahCount: 5,
        goalMet: false,
        updatedAt: 3000,
      },
    };
    local.khatamCycles = [
      {
        id: 'k_local',
        readMask: localMask.readMask,
        readCount: 5,
        startedAt: 2000,
        completedAt: null,
        active: true,
      },
    ];
    local.tasbihLogs = {
      '2026-11-28': {
        date: '2026-11-28',
        totalCount: 33,
        byPreset: { subhanallah: 33 },
        updatedAt: 5000,
      },
    };

    const cloud = emptySnapshot();
    cloud.lastRead = {
      surahId: 1,
      ayahNumber: 5,
      globalAyahId: 5,
      page: 1,
      juz: 1,
      updatedAt: 4000,
    };
    cloud.readingGoal = { unit: 'ayah', amount: 8, targetDate: null };
    cloud.favorites = [{ ayaId: 10, surahId: 2, ayahNumber: 3, createdAt: 500 }];
    cloud.savedSurahs = [1, 18];
    cloud.notes = [
      { ayaId: 10, surahId: 2, ayahNumber: 3, text: 'Versi cloud lama', createdAt: 100, updatedAt: 2000 },
    ];
    cloud.readingDays = {
      '2026-11-28': {
        date: '2026-11-28',
        ayahIds: [4, 5, 6, 7, 8],
        ayahCount: 5,
        goalMet: false,
        updatedAt: 2000,
      },
    };
    cloud.khatamCycles = [
      {
        id: 'k_cloud',
        readMask: cloudMask.readMask,
        readCount: 5,
        startedAt: 1000,
        completedAt: null,
        active: true,
      },
    ];
    cloud.tasbihPresets = [];
    cloud.tasbihLogs = {
      '2026-11-28': {
        date: '2026-11-28',
        totalCount: 33,
        byPreset: { alhamdulillah: 33 },
        updatedAt: 4000,
      },
    };

    const res = mergeGuestWithCloud(local, cloud);

    // Newer local lastRead wins
    expect(res.merged.lastRead?.globalAyahId).toBe(22);
    expect(res.toUpload.profilePatch.lastRead?.globalAyahId).toBe(22);

    // Existing cloud readingGoal preserved
    expect(res.merged.readingGoal?.amount).toBe(8);
    expect(res.toUpload.profilePatch.readingGoal).toBeUndefined();

    // Favorites unioned, only new local favorite uploaded
    expect(res.merged.favorites.map((f) => f.ayaId)).toEqual([20, 10]);
    expect(res.toUpload.favorites.map((f) => f.ayaId)).toEqual([20]);

    // Saved surahs unioned
    expect(res.merged.savedSurahs).toEqual([1, 18, 67]);
    expect(res.toUpload.savedSurahs).toEqual([67]);

    // Newer local note overrides older cloud note
    expect(res.merged.notes[0].text).toBe('Revisi lokal terbaru');
    expect(res.toUpload.notes).toHaveLength(1);

    // Reading day ayahs unioned (1..8 -> 8 ayahs, meeting cloud goal of 8!)
    expect(res.merged.readingDays['2026-11-28'].ayahCount).toBe(8);
    expect(res.merged.readingDays['2026-11-28'].goalMet).toBe(true);
    expect(res.toUpload.readingDays).toHaveLength(1);

    // Active khatam bitmask OR'd into cloud active cycle (1..8 -> 8 ayahs)
    expect(res.merged.khatamCycles).toHaveLength(1);
    expect(res.merged.khatamCycles[0].id).toBe('k_cloud');
    expect(res.merged.khatamCycles[0].readCount).toBe(8);
    expect(res.toUpload.khatamCycles).toHaveLength(1);

    // Tasbih logs merged per preset (subhanallah 33 + alhamdulillah 33 = 66)
    expect(res.merged.tasbihLogs['2026-11-28'].totalCount).toBe(66);
    expect(res.merged.tasbihLogs['2026-11-28'].byPreset).toEqual({
      alhamdulillah: 33,
      subhanallah: 33,
    });
  });
});
