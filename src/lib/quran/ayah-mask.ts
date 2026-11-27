import {
  TOTAL_AYAHS,
  JUZ_START_AYAH,
  JUZ_AYAH_COUNTS,
  isValidGlobalAyah,
} from './meta';

const MASK_BYTES = Math.ceil(TOTAL_AYAHS / 8); // 780 bytes

export function createMask(): Uint8Array {
  return new Uint8Array(MASK_BYTES);
}

export function setBit(mask: Uint8Array, globalAyahId: number): boolean {
  if (!isValidGlobalAyah(globalAyahId)) return false;
  const idx = globalAyahId - 1;
  const byteIdx = idx >> 3;
  const bit = 1 << (idx & 7);
  if (mask[byteIdx] & bit) return false;
  mask[byteIdx] |= bit;
  return true;
}

export function hasBit(mask: Uint8Array, globalAyahId: number): boolean {
  if (!isValidGlobalAyah(globalAyahId)) return false;
  const idx = globalAyahId - 1;
  return Boolean(mask[idx >> 3] & (1 << (idx & 7)));
}

export function countBits(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    let b = mask[i];
    while (b) {
      b &= b - 1;
      count += 1;
    }
  }
  return count;
}

export function encodeMask(mask: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < mask.length; i++) {
    bin += String.fromCharCode(mask[i]);
  }
  return btoa(bin);
}

export function decodeMask(base64?: string | null): Uint8Array {
  const mask = createMask();
  if (!base64 || typeof base64 !== 'string') return mask;
  try {
    const bin = atob(base64);
    const len = Math.min(bin.length, MASK_BYTES);
    for (let i = 0; i < len; i++) {
      mask[i] = bin.charCodeAt(i);
    }
    return mask;
  } catch {
    return createMask();
  }
}

export function markAyahs(
  base64: string | null | undefined,
  globalIds: readonly number[]
): { readMask: string; readCount: number; added: number } {
  const mask = decodeMask(base64);
  let added = 0;
  for (const id of globalIds) {
    if (setBit(mask, id)) added += 1;
  }
  return {
    readMask: encodeMask(mask),
    readCount: countBits(mask),
    added,
  };
}

export function juzCoverage(maskOrBase64: Uint8Array | string | null | undefined): number[] {
  const mask = maskOrBase64 instanceof Uint8Array ? maskOrBase64 : decodeMask(maskOrBase64);
  return JUZ_START_AYAH.map((start, idx) => {
    const total = JUZ_AYAH_COUNTS[idx];
    let hit = 0;
    for (let id = start; id < start + total; id++) {
      if (hasBit(mask, id)) hit += 1;
    }
    return hit / total;
  });
}
