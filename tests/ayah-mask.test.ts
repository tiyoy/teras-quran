import { describe, it, expect } from 'vitest';
import {
  createMask,
  decodeMask,
  encodeMask,
  markAyahs,
  countBits,
  juzCoverage,
} from '@/lib/quran/ayah-mask';
import { TOTAL_AYAHS, toGlobalAyah, fromGlobalAyah, getJuzForAyah } from '@/lib/quran/meta';

describe('quran meta & ayah-mask', () => {
  it('maps surah/ayah to global ayah id 1..6236 and back accurately', () => {
    expect(TOTAL_AYAHS).toBe(6236);
    expect(toGlobalAyah(1, 1)).toBe(1);
    expect(toGlobalAyah(1, 7)).toBe(7);
    expect(toGlobalAyah(2, 1)).toBe(8);
    expect(toGlobalAyah(2, 255)).toBe(262);
    expect(toGlobalAyah(114, 6)).toBe(6236);
    expect(toGlobalAyah(2, 287)).toBe(0);
    expect(toGlobalAyah(115, 1)).toBe(0);

    expect(fromGlobalAyah(262)).toEqual({ surah: 2, ayah: 255 });
    expect(fromGlobalAyah(6236)).toEqual({ surah: 114, ayah: 6 });
    expect(fromGlobalAyah(0)).toBeNull();
    expect(fromGlobalAyah(6237)).toBeNull();

    expect(getJuzForAyah(1)).toBe(1);
    expect(getJuzForAyah(148)).toBe(1);
    expect(getJuzForAyah(149)).toBe(2);
    expect(getJuzForAyah(6236)).toBe(30);
  });

  it('tracks read ayahs in 780-byte bitmask and computes 30-juz coverage', () => {
    const empty = encodeMask(createMask());
    const r1 = markAyahs(empty, [1, 2, 3, 4, 5, 6, 7]);
    expect(r1.readCount).toBe(7);
    expect(r1.added).toBe(7);

    // Re-marking same ayahs adds 0
    const r2 = markAyahs(r1.readMask, [1, 2, 3, 8]);
    expect(r2.readCount).toBe(8);
    expect(r2.added).toBe(1);

    // Mark all ayahs of Juz 30 (5673..6236)
    const juz30Ids = Array.from({ length: 6236 - 5673 + 1 }, (_, i) => 5673 + i);
    const r3 = markAyahs(r2.readMask, juz30Ids);
    const cov = juzCoverage(r3.readMask);
    expect(cov).toHaveLength(30);
    expect(cov[29]).toBe(1);
    expect(cov[0]).toBeGreaterThan(0);
    expect(cov[1]).toBe(0);
  });

  it('recovers safely from corrupted base64 mask strings', () => {
    const decoded = decodeMask('!!!not-valid-base64###');
    expect(countBits(decoded)).toBe(0);
  });
});
