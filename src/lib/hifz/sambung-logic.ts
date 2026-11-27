export interface SambungPoolItem {
  surahId: number;
  ayahNumber: number;
  globalId: number;
}

export interface SambungQuestion {
  prompt: SambungPoolItem;
  answer: SambungPoolItem;
}

export function generateSambungQuestions(
  pool: readonly SambungPoolItem[],
  requestedCount: number
): SambungQuestion[] {
  const byKey = new Map(pool.map((p) => [`${p.surahId}:${p.ayahNumber}`, p]));
  const pairs: SambungQuestion[] = [];

  for (const item of pool) {
    const next = byKey.get(`${item.surahId}:${item.ayahNumber + 1}`);
    if (next) {
      pairs.push({ prompt: item, answer: next });
    }
  }

  // Fisher-Yates shuffle
  const shuffled = [...pairs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.max(1, Math.min(requestedCount, shuffled.length)));
}
