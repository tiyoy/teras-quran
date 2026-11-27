import { describe, it, expect } from 'vitest';
import {
  tapTasbih,
  undoTasbih,
  validateCustomTarget,
  computeProgressPercent,
  createBadaSholatState,
  tapBadaSholat,
} from '@/lib/tasbih/tasbih-logic';

describe('tasbih-logic', () => {
  it('validates custom target bounds (0 = unlimited, 1..10000)', () => {
    expect(validateCustomTarget(0)).toBe(0);
    expect(validateCustomTarget(-5)).toBe(0);
    expect(validateCustomTarget(33)).toBe(33);
    expect(validateCustomTarget(40.8)).toBe(40);
    expect(validateCustomTarget(15000)).toBe(10000);
    expect(validateCustomTarget(Number.NaN)).toBe(33);
  });

  it('handles tap rollover in autoNextRound mode vs stop-at-target mode', () => {
    // Auto rollover at target 3
    let state = { count: 2, rounds: 0, sessionTotal: 2 };
    const r1 = tapTasbih(state, 3, true);
    expect(r1.reachedTarget).toBe(true);
    expect(r1.nextState).toEqual({ count: 0, rounds: 1, sessionTotal: 3 });

    // Stop-at-target mode keeps count at 3 and increments rounds once
    const r2 = tapTasbih(state, 3, false);
    expect(r2.reachedTarget).toBe(true);
    expect(r2.nextState).toEqual({ count: 3, rounds: 1, sessionTotal: 3 });

    // Unlimited mode (target = 0) never triggers target reached
    const r3 = tapTasbih({ count: 99, rounds: 0, sessionTotal: 99 }, 0, true);
    expect(r3.reachedTarget).toBe(false);
    expect(r3.nextState.count).toBe(100);
    expect(computeProgressPercent(100, 0)).toBe(0);
  });

  it('clamps undo at 0 and computes valid progress percent', () => {
    expect(undoTasbih({ count: 0, rounds: 1, sessionTotal: 33 })).toEqual({
      count: 0,
      rounds: 1,
      sessionTotal: 33,
    });
    expect(undoTasbih({ count: 5, rounds: 0, sessionTotal: 5 })).toEqual({
      count: 4,
      rounds: 0,
      sessionTotal: 4,
    });
    expect(computeProgressPercent(16, 33)).toBeCloseTo(48.48, 1);
    expect(computeProgressPercent(40, 33)).toBe(100);
  });

  it('steps through Bada Sholat sequence (33 -> 33 -> 33 -> 1 = 100 taps)', () => {
    let seq = createBadaSholatState();
    expect(seq.stepIndex).toBe(0);
    expect(seq.completed).toBe(false);

    for (let i = 0; i < 33; i++) {
      seq = tapBadaSholat(seq).nextState;
    }
    expect(seq.stepIndex).toBe(1);
    expect(seq.count).toBe(0);

    for (let i = 0; i < 66; i++) {
      seq = tapBadaSholat(seq).nextState;
    }
    expect(seq.stepIndex).toBe(3); // final step (Tahlil x1)
    expect(seq.completed).toBe(false);

    const last = tapBadaSholat(seq);
    expect(last.completedAll).toBe(true);
    expect(last.nextState.completed).toBe(true);
    expect(last.nextState.totalTaps).toBe(100);
  });
});
