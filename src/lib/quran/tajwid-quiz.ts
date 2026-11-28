import { TAJWID_RULES } from '@/data/tajwid-rules';
import {
  tajwidClassName,
  type TajwidGroup,
  type TajwidSegment,
} from '@/lib/quran/tajwid-parser';

export interface TajwidQuizQuestion {
  surahId: number;
  ayahNumber: number;
  segments: TajwidSegment[];
  targetIdx: number;
  correctGroup: TajwidGroup;
  options: TajwidGroup[];
}

export interface TajwidQuizScore {
  correct: number;
  total: number;
}

export const TAJWID_QUIZ_SURAH_POOL: readonly number[] = [
  1, 97, 99, 100, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
];

const NEUTRAL_TARGET_CLASS =
  'rounded-md border-2 border-[var(--primary)] bg-[var(--accent)] px-1.5 py-0.5 text-[var(--foreground)]';

export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getQuestionKey(
  q: Pick<TajwidQuizQuestion, 'surahId' | 'ayahNumber' | 'targetIdx'>
): string {
  return `${q.surahId}:${q.ayahNumber}:${q.targetIdx}`;
}

/**
 * Returns the CSS class for a quiz segment without leaking any tajwid rule class
 * or color into the DOM before the question has been answered.
 */
export function getSegmentQuizClassName(
  isTarget: boolean,
  answered: boolean,
  group: TajwidGroup | null
): string {
  if (!isTarget || !group) return '';
  if (!answered) return NEUTRAL_TARGET_CLASS;
  return `${tajwidClassName(group)} rounded-md border-2 border-current bg-[var(--card)] px-1.5 py-0.5`;
}

export function shouldShowQuestionSource(answered: boolean): boolean {
  return answered;
}

export function shouldInvalidateQuestionOnLearnTab(
  hasActiveQuestion: boolean,
  answered: boolean
): boolean {
  return hasActiveQuestion && !answered;
}

export function evaluateTajwidAnswer(
  currentPicked: TajwidGroup | null,
  chosenOption: TajwidGroup,
  correctGroup: TajwidGroup,
  score: TajwidQuizScore
): { accepted: boolean; picked: TajwidGroup; score: TajwidQuizScore } {
  if (currentPicked !== null) {
    return { accepted: false, picked: currentPicked, score };
  }
  return {
    accepted: true,
    picked: chosenOption,
    score: {
      correct: score.correct + (chosenOption === correctGroup ? 1 : 0),
      total: score.total + 1,
    },
  };
}

export function buildTajwidQuestion(
  surahId: number,
  tajwidMap: ReadonlyMap<number, TajwidSegment[]>,
  previousKey: string | null = null,
  rng: () => number = Math.random
): TajwidQuizQuestion | null {
  const candidates: Array<{
    ayahNumber: number;
    segments: TajwidSegment[];
    targetIdx: number;
    group: TajwidGroup;
  }> = [];

  for (const [ayahNum, segs] of tajwidMap.entries()) {
    segs.forEach(([, grp], idx) => {
      if (grp && grp !== 'silent') {
        candidates.push({ ayahNumber: ayahNum, segments: segs, targetIdx: idx, group: grp });
      }
    });
  }

  if (!candidates.length) return null;

  const filtered = previousKey
    ? candidates.filter(
        (c) => getQuestionKey({ surahId, ayahNumber: c.ayahNumber, targetIdx: c.targetIdx }) !== previousKey
      )
    : candidates;
  const pool = filtered.length > 0 ? filtered : candidates;
  const chosen = pool[Math.floor(rng() * pool.length)];

  const distractorPool = TAJWID_RULES.map((r) => r.id).filter(
    (g) => g !== chosen.group && g !== 'silent'
  );
  const distractors = shuffleArray(distractorPool, rng).slice(0, 3);
  const options = shuffleArray([chosen.group, ...distractors], rng);

  return {
    surahId,
    ayahNumber: chosen.ayahNumber,
    segments: chosen.segments,
    targetIdx: chosen.targetIdx,
    correctGroup: chosen.group,
    options,
  };
}
