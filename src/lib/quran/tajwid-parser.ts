export const TAJWID_GROUPS = [
  'ghunnah',
  'ikhfa',
  'idghamBigunnah',
  'idghamBilagunnah',
  'idghamMutajanisain',
  'iqlab',
  'qalqalah',
  'madThabii',
  'madWajibJaiz',
  'madArid',
  'madLazim',
  'silent',
] as const;

export type TajwidGroup = (typeof TAJWID_GROUPS)[number];

export type TajwidSegment = [text: string, group: TajwidGroup | null];

const CODE_TO_GROUP: Record<string, TajwidGroup> = {
  // Ghunnah
  g: 'ghunnah',
  // Ikhfa & Ikhfa Shafawi
  f: 'ikhfa',
  c: 'ikhfa',
  // Idgham with Ghunnah & Idgham Shafawi
  a: 'idghamBigunnah',
  w: 'idghamBigunnah',
  // Idgham without Ghunnah
  u: 'idghamBilagunnah',
  // Idgham Mutajanisain & Mutaqaribain
  d: 'idghamMutajanisain',
  b: 'idghamMutajanisain',
  // Iqlab
  i: 'iqlab',
  // Qalqalah
  q: 'qalqalah',
  // Madd 2 (normal)
  n: 'madThabii',
  // Madd 4/5 (obligatory/permissible)
  o: 'madWajibJaiz',
  // Madd 2/4/6 (arid lissukun)
  p: 'madArid',
  // Madd 6 (necessary / lazim)
  m: 'madLazim',
  // Silent letters: hamzat wasl, lam shamsiyyah, silent
  h: 'silent',
  l: 'silent',
  s: 'silent',
};

export function tajwidClassName(group: TajwidGroup): string {
  return `tajwid-${group.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}`;
}

function pushSegment(out: TajwidSegment[], text: string, group: TajwidGroup | null): void {
  if (!text) return;
  const prev = out[out.length - 1];
  if (prev && prev[1] === group) {
    prev[0] += text;
  } else {
    out.push([text, group]);
  }
}

/**
 * Parses alquran.cloud `quran-tajweed` bracket syntax: `[code[:id][arabicText]`
 * Unknown codes or malformed/unclosed brackets safely degrade to plain text without dropping characters.
 */
export function parseTajweedMarkup(raw: string): TajwidSegment[] {
  if (!raw) return [];
  const out: TajwidSegment[] = [];
  let i = 0;

  while (i < raw.length) {
    if (raw[i] === '[') {
      const innerOpen = raw.indexOf('[', i + 1);
      const header = innerOpen > i ? raw.slice(i + 1, innerOpen) : '';
      const validHeader = /^[a-z](?::\d+)?$/i.test(header);

      if (validHeader && innerOpen > i) {
        const closeIdx = raw.indexOf(']', innerOpen + 1);
        if (closeIdx > innerOpen) {
          const code = header[0].toLowerCase();
          const group = CODE_TO_GROUP[code] ?? null;
          const body = raw.slice(innerOpen + 1, closeIdx);
          pushSegment(out, body, group);
          i = closeIdx + 1;
          continue;
        }
        // Unclosed bracket: strip header tag, preserve remaining Arabic text safely
        pushSegment(out, raw.slice(innerOpen + 1), null);
        break;
      }
    }

    const nextBracket = raw.indexOf('[', i + 1);
    const end = nextBracket === -1 ? raw.length : nextBracket;
    pushSegment(out, raw.slice(i, end), null);
    i = end;
  }

  return out;
}
