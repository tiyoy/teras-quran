const DAY_MS = 86_400_000;

export const HIJRI_OFFSETS = [-2, -1, 0, 1, 2] as const;

function shiftDate(date: Date, offsetDays: number): Date {
  return new Date(date.getTime() + offsetDays * DAY_MS);
}

export function formatHijriDate(
  date: Date,
  offsetDays = 0,
  locale: 'id' | 'en' = 'id',
  timeZone?: string,
  style: 'long' | 'short' = 'long'
): string {
  const opts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short' };
  const fmt = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura-nu-latn`, {
    ...opts,
    ...(timeZone ? { timeZone } : {}),
  });
  return fmt.format(shiftDate(date, offsetDays));
}

function getHijriParts(date: Date, offsetDays = 0, timeZone?: string) {
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });
  const parts = fmt.formatToParts(shiftDate(date, offsetDays));
  const num = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? '', 10);
  return { day: num('day'), month: num('month'), year: num('year') };
}

export function getRamadanStatus(
  date: Date,
  offsetDays = 0,
  timeZone?: string
): { kind: 'during'; day: number; year: number } | { kind: 'until'; days: number; year: number } | null {
  const cur = getHijriParts(date, offsetDays, timeZone);
  if (!Number.isFinite(cur.month)) return null;
  if (cur.month === 9) {
    return { kind: 'during', day: cur.day, year: cur.year };
  }
  const monthsAhead = (9 - cur.month + 12) % 12;
  let guess = Math.max(1, monthsAhead * 29 - cur.day - 2);
  for (; guess <= 400; guess++) {
    const p = getHijriParts(shiftDate(date, guess), offsetDays, timeZone);
    if (p.month === 9) {
      return { kind: 'until', days: guess, year: p.year };
    }
  }
  return null;
}
