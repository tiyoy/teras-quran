export function triggerHaptic(isTargetReached = false): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(isTargetReached ? [40, 60, 90] : 15);
  } catch {
    // Ignore unsupported platforms
  }
}
