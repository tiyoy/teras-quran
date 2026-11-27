import { BADA_SHOLAT_STEPS } from '@/data/tasbih-presets';

export interface TasbihCounterState {
  count: number;
  rounds: number;
  sessionTotal: number;
}

export interface BadaSholatState {
  stepIndex: number;
  count: number;
  totalTaps: number;
  completed: boolean;
}

export const MAX_CUSTOM_TARGET = 10_000;

export function validateCustomTarget(value: number): number {
  if (!Number.isFinite(value)) return 33;
  const intVal = Math.trunc(value);
  if (intVal <= 0) return 0; // 0 = unlimited
  return Math.min(MAX_CUSTOM_TARGET, intVal);
}

export function computeProgressPercent(count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (count / target) * 100));
}

export function tapTasbih(
  state: TasbihCounterState,
  target: number,
  autoNextRound: boolean
): { nextState: TasbihCounterState; reachedTarget: boolean } {
  const cleanTarget = validateCustomTarget(target);

  if (cleanTarget === 0) {
    return {
      nextState: {
        count: state.count + 1,
        rounds: state.rounds,
        sessionTotal: state.sessionTotal + 1,
      },
      reachedTarget: false,
    };
  }

  // If stop-at-target mode already reached target, keep stopped until user resets or continues
  if (!autoNextRound && state.count >= cleanTarget) {
    return { nextState: state, reachedTarget: false };
  }

  const nextCount = state.count + 1;
  const nextTotal = state.sessionTotal + 1;

  if (nextCount >= cleanTarget) {
    return {
      nextState: {
        count: autoNextRound ? 0 : cleanTarget,
        rounds: state.rounds + 1,
        sessionTotal: nextTotal,
      },
      reachedTarget: true,
    };
  }

  return {
    nextState: {
      count: nextCount,
      rounds: state.rounds,
      sessionTotal: nextTotal,
    },
    reachedTarget: false,
  };
}

export function undoTasbih(state: TasbihCounterState): TasbihCounterState {
  if (state.count <= 0) return state;
  return {
    count: state.count - 1,
    rounds: state.rounds,
    sessionTotal: Math.max(0, state.sessionTotal - 1),
  };
}

export function createBadaSholatState(): BadaSholatState {
  return {
    stepIndex: 0,
    count: 0,
    totalTaps: 0,
    completed: false,
  };
}

export function tapBadaSholat(
  state: BadaSholatState
): { nextState: BadaSholatState; stepFinished: boolean; completedAll: boolean } {
  if (state.completed) {
    return { nextState: state, stepFinished: false, completedAll: false };
  }

  const currentStep = BADA_SHOLAT_STEPS[state.stepIndex];
  if (!currentStep) {
    return { nextState: { ...state, completed: true }, stepFinished: false, completedAll: true };
  }

  const nextCount = state.count + 1;
  const nextTotal = state.totalTaps + 1;

  if (nextCount >= currentStep.target) {
    const isLastStep = state.stepIndex >= BADA_SHOLAT_STEPS.length - 1;
    if (isLastStep) {
      return {
        nextState: {
          stepIndex: state.stepIndex,
          count: currentStep.target,
          totalTaps: nextTotal,
          completed: true,
        },
        stepFinished: true,
        completedAll: true,
      };
    }
    return {
      nextState: {
        stepIndex: state.stepIndex + 1,
        count: 0,
        totalTaps: nextTotal,
        completed: false,
      },
      stepFinished: true,
      completedAll: false,
    };
  }

  return {
    nextState: {
      stepIndex: state.stepIndex,
      count: nextCount,
      totalTaps: nextTotal,
      completed: false,
    },
    stepFinished: false,
    completedAll: false,
  };
}
