export const TOTAL_AYAHS = 6236;

export const SURAH_AYAH_COUNTS: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112,
  78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8,
  8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export const JUZ_START_AYAH: readonly number[] = [
  1, 149, 260, 385, 517, 641, 752, 900, 1042, 1201, 1329, 1479, 1649, 1804, 2030, 2215, 2484, 2674,
  2876, 3219, 3385, 3564, 3727, 4090, 4265, 4511, 4706, 5105, 5242, 5673,
];

export const JUZ_AYAH_COUNTS: readonly number[] = JUZ_START_AYAH.map(
  (start, idx) => (JUZ_START_AYAH[idx + 1] ?? TOTAL_AYAHS + 1) - start
);

export function isValidGlobalAyah(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= TOTAL_AYAHS;
}

export function getSurahAyahCount(surahId: number): number {
  return SURAH_AYAH_COUNTS[surahId - 1] ?? 0;
}

export function toGlobalAyah(surahId: number, ayahNumber: number): number {
  if (
    !Number.isInteger(surahId) ||
    !Number.isInteger(ayahNumber) ||
    surahId < 1 ||
    surahId > SURAH_AYAH_COUNTS.length ||
    ayahNumber < 1 ||
    ayahNumber > SURAH_AYAH_COUNTS[surahId - 1]
  ) {
    return 0;
  }
  let sum = ayahNumber;
  for (let i = 0; i < surahId - 1; i++) {
    sum += SURAH_AYAH_COUNTS[i];
  }
  return sum;
}

export function fromGlobalAyah(globalId: number): { surah: number; ayah: number } | null {
  if (!isValidGlobalAyah(globalId)) return null;
  let rem = globalId;
  let surah = 1;
  while (rem > SURAH_AYAH_COUNTS[surah - 1]) {
    rem -= SURAH_AYAH_COUNTS[surah - 1];
    surah += 1;
  }
  return { surah, ayah: rem };
}

export function getJuzForAyah(globalId: number): number {
  if (!isValidGlobalAyah(globalId)) return 0;
  let juz = 1;
  while (juz < 30 && JUZ_START_AYAH[juz] <= globalId) {
    juz += 1;
  }
  return juz;
}

const HIZB_FRACTIONS = ['', '¼', '½', '¾'] as const;

export function formatHizb(quarter: number): string {
  const n = Number.isFinite(quarter) ? Math.max(1, Math.trunc(quarter)) - 1 : 0;
  return `${Math.floor(n / 4) + 1}${HIZB_FRACTIONS[n % 4]}`;
}

export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return formatDateKey(dt);
}

export function diffDateKeys(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = fromKey.split('-').map(Number);
  const [y2, m2, d2] = toKey.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}
