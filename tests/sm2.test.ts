import { describe, it, expect } from 'vitest';
import {
  rateHifzItem,
  mergeHifzRange,
  buildBulkImportRanges,
  getHifzStrength,
  type HifzItem,
} from '@/lib/hifz/sm2';
import { generateSambungQuestions } from '@/lib/hifz/sambung-logic';

describe('hifz SM-2 & range merge', () => {
  it('updates ease, interval, repetitions, and dueDate for all 4 ratings', () => {
    const base = { ease: 2.5, interval: 3, repetitions: 2 };

    const forgot = rateHifzItem(base, 1, '2026-11-27');
    expect(forgot.interval).toBe(1);
    expect(forgot.repetitions).toBe(0);
    expect(forgot.ease).toBe(2.3);
    expect(forgot.dueDate).toBe('2026-11-28');

    const hard = rateHifzItem(base, 3, '2026-11-27');
    expect(hard.repetitions).toBe(3);
    expect(hard.ease).toBe(2.35);
    expect(hard.interval).toBe(4); // round(min(3*1.2=3.6, 7.5)) = 4

    const good = rateHifzItem(base, 4, '2026-11-27');
    expect(good.repetitions).toBe(3);
    expect(good.ease).toBe(2.5);
    expect(good.interval).toBe(8); // round(3 * 2.5) = 8

    const easy = rateHifzItem({ ease: 2.95, interval: 40, repetitions: 5 }, 5, '2026-11-27');
    expect(easy.ease).toBe(3.0); // clamped at max 3.0
    expect(easy.interval).toBe(60); // capped at 60 days
  });

  it('merges adjacent and overlapping ranges in same surah and detects covered ranges', () => {
    const existing: HifzItem[] = [
      {
        id: 'h1',
        surahId: 67,
        fromAyah: 1,
        toAyah: 5,
        ayahCount: 5,
        memorizedAt: 1000,
        ease: 2.5,
        interval: 3,
        repetitions: 2,
        dueDate: '2026-11-28',
        lastReviewedAt: null,
        lastRating: null,
        reviewCount: 0,
      },
    ];

    // Adjacent 6..10 merges into 1..10
    const merged = mergeHifzRange(
      existing,
      { surahId: 67, fromAyah: 6, toAyah: 10 },
      2000,
      '2026-11-27'
    );
    expect(merged.covering).toBeNull();
    expect(merged.target?.id).toBe('h1');
    expect(merged.target?.data.fromAyah).toBe(1);
    expect(merged.target?.data.toAyah).toBe(10);
    expect(merged.target?.data.ayahCount).toBe(10);
    expect(merged.target?.data.memorizedAt).toBe(1000);

    // Covered 2..4 returns covering item without changes
    const covered = mergeHifzRange(
      existing,
      { surahId: 67, fromAyah: 2, toAyah: 4 },
      2000,
      '2026-11-27'
    );
    expect(covered.target).toBeNull();
    expect(covered.covering?.id).toBe('h1');
  });

  it('builds staggered 30-day bulk import for Juz 30 and evaluates strength', () => {
    const specs = buildBulkImportRanges('juz', 30);
    expect(specs.length).toBe(37); // Surahs 78..114
    expect(specs[0].range.surahId).toBe(78);
    expect(specs[specs.length - 1].range.surahId).toBe(114);
    expect(specs[0].initial.interval).toBe(1);
    expect(specs[specs.length - 1].initial.interval).toBeLessThanOrEqual(30);

    expect(getHifzStrength({ ease: 1.5, interval: 5, lastRating: 3 })).toBe('weak');
    expect(getHifzStrength({ ease: 2.5, interval: 5, lastRating: 1 })).toBe('weak');
    expect(getHifzStrength({ ease: 2.5, interval: 21, lastRating: 4 })).toBe('strong');
    expect(getHifzStrength({ ease: 2.5, interval: 6, lastRating: 4 })).toBe('fair');
  });

  it('generates sambung ayat prompt-answer pairs from consecutive ayahs', () => {
    const pool = [
      { surahId: 1, ayahNumber: 1, globalId: 1 },
      { surahId: 1, ayahNumber: 2, globalId: 2 },
      { surahId: 1, ayahNumber: 3, globalId: 3 },
      { surahId: 1, ayahNumber: 4, globalId: 4 },
    ];
    const qs = generateSambungQuestions(pool, 10);
    expect(qs).toHaveLength(3); // only 3 valid prompt->next pairs
    for (const q of qs) {
      expect(q.answer.ayahNumber).toBe(q.prompt.ayahNumber + 1);
      expect(q.answer.surahId).toBe(q.prompt.surahId);
    }
  });
});
