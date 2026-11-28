import { describe, expect, it } from 'vitest';
import {
  buildTajwidQuestion,
  evaluateTajwidAnswer,
  getQuestionKey,
  getSegmentQuizClassName,
  shouldInvalidateQuestionOnLearnTab,
  shouldShowQuestionSource,
  shuffleArray,
} from '@/lib/quran/tajwid-quiz';
import type { TajwidSegment } from '@/lib/quran/tajwid-parser';

describe('tajwid-quiz anti-cheat rules', () => {
  describe('getSegmentQuizClassName', () => {
    it('never leaks tajwid rule CSS class or color before the question is answered', () => {
      const cls = getSegmentQuizClassName(true, false, 'ikhfa');
      expect(cls).not.toContain('tajwid-');
      expect(cls).not.toContain('ikhfa');
      expect(cls).toContain('border-[var(--primary)]');
    });

    it('reveals the real tajwid CSS class after the question is answered', () => {
      const cls = getSegmentQuizClassName(true, true, 'qalqalah');
      expect(cls).toContain('tajwid-qalqalah');
      expect(cls).toContain('border-current');
    });

    it('returns empty class for non-target segments', () => {
      expect(getSegmentQuizClassName(false, false, 'ghunnah')).toBe('');
      expect(getSegmentQuizClassName(false, true, 'ghunnah')).toBe('');
      expect(getSegmentQuizClassName(true, false, null)).toBe('');
    });
  });

  describe('shouldShowQuestionSource', () => {
    it('hides surah and ayah citation until user answers', () => {
      expect(shouldShowQuestionSource(false)).toBe(false);
      expect(shouldShowQuestionSource(true)).toBe(true);
    });
  });

  describe('shouldInvalidateQuestionOnLearnTab', () => {
    it('invalidates an active unanswered question when user opens the learn tab', () => {
      expect(shouldInvalidateQuestionOnLearnTab(true, false)).toBe(true);
    });

    it('does not invalidate when question is already answered or absent', () => {
      expect(shouldInvalidateQuestionOnLearnTab(true, true)).toBe(false);
      expect(shouldInvalidateQuestionOnLearnTab(false, false)).toBe(false);
    });
  });

  describe('evaluateTajwidAnswer', () => {
    it('records correct and wrong answers once', () => {
      const correctRes = evaluateTajwidAnswer(null, 'ikhfa', 'ikhfa', { correct: 1, total: 2 });
      expect(correctRes.accepted).toBe(true);
      expect(correctRes.picked).toBe('ikhfa');
      expect(correctRes.score).toEqual({ correct: 2, total: 3 });

      const wrongRes = evaluateTajwidAnswer(null, 'qalqalah', 'ikhfa', { correct: 1, total: 2 });
      expect(wrongRes.accepted).toBe(true);
      expect(wrongRes.picked).toBe('qalqalah');
      expect(wrongRes.score).toEqual({ correct: 1, total: 3 });
    });

    it('ignores replay or duplicate clicks after a question is already answered', () => {
      const replay = evaluateTajwidAnswer('qalqalah', 'ikhfa', 'ikhfa', { correct: 1, total: 2 });
      expect(replay.accepted).toBe(false);
      expect(replay.picked).toBe('qalqalah');
      expect(replay.score).toEqual({ correct: 1, total: 2 });
    });
  });

  describe('buildTajwidQuestion', () => {
    it('builds 4 unique non-silent options containing the correct rule and skips silent targets', () => {
      const map = new Map<number, TajwidSegment[]>([
        [
          1,
          [
            ['ٱ', 'silent'],
            ['لْحَمْدُ ', null],
            ['لِلّٰهِ', 'madThabii'],
          ],
        ],
      ]);

      const q = buildTajwidQuestion(1, map, null, () => 0.35);
      expect(q).not.toBeNull();
      expect(q!.correctGroup).toBe('madThabii');
      expect(q!.targetIdx).toBe(2);
      expect(q!.options).toHaveLength(4);
      expect(new Set(q!.options).size).toBe(4);
      expect(q!.options).toContain('madThabii');
      expect(q!.options).not.toContain('silent');
    });

    it('avoids repeating the exact previous question when another candidate exists', () => {
      const map = new Map<number, TajwidSegment[]>([
        [
          1,
          [
            ['قُلْ ', null],
            ['أَعُوذُ', 'madThabii'],
            [' بِرَبِّ ', null],
            ['ٱلنَّاسِ', 'ghunnah'],
          ],
        ],
      ]);

      // Deterministic rng = 0 always selects index 0 unless filtered out
      const first = buildTajwidQuestion(114, map, null, () => 0);
      expect(first).not.toBeNull();
      const firstKey = getQuestionKey(first!);

      const second = buildTajwidQuestion(114, map, firstKey, () => 0);
      expect(second).not.toBeNull();
      expect(getQuestionKey(second!)).not.toBe(firstKey);
    });

    it('falls back gracefully when only one candidate exists', () => {
      const map = new Map<number, TajwidSegment[]>([[1, [['نّ', 'ghunnah']]]]);
      const q = buildTajwidQuestion(108, map, '108:1:0', () => 0);
      expect(q).not.toBeNull();
      expect(getQuestionKey(q!)).toBe('108:1:0');
    });
  });

  describe('shuffleArray', () => {
    it('preserves all elements without mutating input', () => {
      const input = ['a', 'b', 'c', 'd'];
      const shuffled = shuffleArray(input, () => 0.5);
      expect(input).toEqual(['a', 'b', 'c', 'd']);
      expect([...shuffled].sort()).toEqual(['a', 'b', 'c', 'd']);
    });
  });
});
