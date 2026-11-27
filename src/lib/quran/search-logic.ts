import { toGlobalAyah } from './meta';

export type SearchLang = 'id' | 'en' | 'ar' | 'tr';
export type SearchRow = [globalId: number, surahId: number, ayahNumber: number, text: string];

export interface SearchIndex {
  lang: SearchLang;
  rows: SearchRow[];
  texts: string[];
}

export interface ParsedQuery {
  terms: string[];
  phrases: string[];
  full: string;
  tooShort: boolean;
}

export interface SearchHit {
  row: SearchRow;
  phrase: boolean;
  count: number;
}

const IGNORED_PUNCT = new Set(['-', "'", '’', '‘', '`', 'ʼ', 'ʻ', 'ʿ', 'ʾ', '‐', '‑']);
const ARABIC_TATWEEL = new Set(['ـ', 'ۥ', 'ۦ', 'ە']);
const ARABIC_FOLD: Record<string, string> = {
  'ٱ': 'ا',
  'أ': 'ا',
  'إ': 'ا',
  'آ': 'ا',
  'ى': 'ي',
  'ی': 'ي',
  'ة': 'ه',
  'ک': 'ك',
  'ٰ': '',
};

const COMBINING_MARK_RE = /\p{M}/u;
const ALNUM_RE = /[\p{L}\p{N}]/u;
const NON_WORD_RE = /[^\p{L}\p{N}\p{M}]/u;
const QUOTE_SPLIT_RE = /["“”„«»]/;
const DIRECT_NUM_RE = /^(?:qs\.?\s*)?(\d{1,3})\s*(?:[:.]|\s)\s*(\d{1,3})$/i;
const DIRECT_NAME_RE = /^(?:(?:qs|q\.s|surah|surat|sura)\.?\s+)?(.*?\p{L}.*?)\s*[:\s.]\s*(\d{1,3})$/iu;
const SURAH_PREFIX_RE = /^(?:al|an|ar|as|asy|ash|at|ad|adh|az|ats)[\s-]+/i;

const charCache = new Map<string, string>();

function normalizeChar(ch: string): string {
  const cached = charCache.get(ch);
  if (cached !== undefined) return cached;
  let out: string;
  if (IGNORED_PUNCT.has(ch) || ARABIC_TATWEEL.has(ch) || COMBINING_MARK_RE.test(ch)) {
    out = '';
  } else {
    out = '';
    for (const c of ch.toLowerCase().normalize('NFKD')) {
      if (COMBINING_MARK_RE.test(c) || ARABIC_TATWEEL.has(c)) continue;
      if (ALNUM_RE.test(c)) {
        out += ARABIC_FOLD[c] ?? c;
      } else {
        out += ' ';
      }
    }
    if (out.includes(' ')) {
      out = out.replaceAll(' ', '') || ' ';
    }
  }
  charCache.set(ch, out);
  return out;
}

const FOLD_DIGRAPHS: Record<'id' | 'translit', Record<string, string>> = {
  id: { sh: 's', dz: 'z' },
  translit: { ee: 'i', oo: 'u' },
};

function foldSequence(chars: string[], map: number[], kind: 'id' | 'translit') {
  const rules = FOLD_DIGRAPHS[kind];
  const dedup = kind === 'translit';
  const outChars: string[] = [];
  const outMap: number[] = [];

  const push = (c: string, pos: number) => {
    if (dedup && c !== ' ' && outChars[outChars.length - 1] === c) return;
    outChars.push(c);
    outMap.push(pos);
  };

  for (let i = 0; i < chars.length; i++) {
    const pair = chars[i] + (chars[i + 1] ?? '');
    if (rules[pair]) {
      push(rules[pair], map[i]);
      i += 1;
    } else {
      push(chars[i], map[i]);
    }
  }
  return { chars: outChars, map: outMap };
}

function normalizeWithMap(input: string, fold?: 'id' | 'translit'): { text: string; map: number[] } {
  let chars: string[] = [];
  let map: number[] = [];
  let pendingSpace = -1;
  let offset = 0;

  for (const ch of input) {
    const pos = offset;
    offset += ch.length;
    const norm = normalizeChar(ch);
    if (norm === '') continue;
    if (norm === ' ') {
      if (pendingSpace < 0) pendingSpace = pos;
    } else {
      if (pendingSpace >= 0 && chars.length > 0) {
        chars.push(' ');
        map.push(pendingSpace);
      }
      pendingSpace = -1;
      for (const c of norm) {
        chars.push(c);
        map.push(pos);
      }
    }
  }

  if (fold) {
    ({ chars, map } = foldSequence(chars, map, fold));
  }
  return { text: chars.join(''), map };
}

const LANG_FOLD: Record<SearchLang, 'id' | 'translit' | undefined> = {
  id: 'id',
  en: undefined,
  ar: undefined,
  tr: 'translit',
};

export function normalizeText(lang: SearchLang, value: string): { text: string; map: number[] } {
  return normalizeWithMap(value, LANG_FOLD[lang]);
}

export function isArabicQuery(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
}

export function parseQuery(raw: string, lang: SearchLang): ParsedQuery {
  const parts = raw.split(QUOTE_SPLIT_RE);
  const terms = new Set<string>();
  const phrases = new Set<string>();

  parts.forEach((part, idx) => {
    const norm = normalizeText(lang, part).text;
    if (!norm) return;
    if (idx % 2 === 1 && norm.includes(' ')) {
      phrases.add(norm);
    } else {
      for (const word of norm.split(' ')) {
        if (word) terms.add(word);
      }
    }
  });

  const full = normalizeText(lang, parts.join(' ')).text;
  return {
    terms: [...terms],
    phrases: [...phrases],
    full,
    tooShort: full.replaceAll(' ', '').length < 3,
  };
}

function surahKey(name: string): string {
  return normalizeWithMap(name, 'translit').text.replace(/[^a-z]/g, '');
}

function surahKeys(name: string): string[] {
  const stripped = name.trim().replace(SURAH_PREFIX_RE, '');
  return [...new Set([surahKey(name), surahKey(stripped)].filter(Boolean))];
}

export function parseVerseReference(
  query: string,
  surahs: ReadonlyArray<{ id: number; name: string; englishName?: string }>
): { surah: number; ayah: number } | null {
  const trimmed = query.trim();
  let surahId = 0;
  let ayah = 0;

  const numMatch = DIRECT_NUM_RE.exec(trimmed);
  if (numMatch) {
    surahId = Number(numMatch[1]);
    ayah = Number(numMatch[2]);
  } else {
    const nameMatch = DIRECT_NAME_RE.exec(trimmed);
    if (!nameMatch) return null;
    const rawName = nameMatch[1];
    ayah = Number(nameMatch[2]);
    const keys = surahKeys(rawName);
    if (!keys.length || keys[0].length < 3) return null;

    const indexed = surahs.map((s) => ({
      id: s.id,
      keys: [...surahKeys(s.name), ...surahKeys(s.englishName ?? '')],
    }));

    const exact = indexed.find((s) => s.keys.some((k) => keys.includes(k)));
    if (exact) {
      surahId = exact.id;
    } else {
      const prefixMatches = new Set(
        indexed
          .filter((s) =>
            s.keys.some((k) =>
              keys.some(
                (q) =>
                  q.length >= 3 &&
                  ((k.startsWith(q) && k.length - q.length <= 2) ||
                    (q.startsWith(k) && q.length - k.length <= 2))
              )
            )
          )
          .map((s) => s.id)
      );
      if (prefixMatches.size === 1) {
        surahId = [...prefixMatches][0];
      }
    }
  }

  return toGlobalAyah(surahId, ayah) > 0 ? { surah: surahId, ayah } : null;
}

export function buildSearchIndex(lang: SearchLang, rows: SearchRow[]): SearchIndex {
  return {
    lang,
    rows,
    texts: rows.map((row) => normalizeText(lang, row[3]).text),
  };
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  for (let pos = haystack.indexOf(needle); pos >= 0; pos = haystack.indexOf(needle, pos + needle.length)) {
    count += 1;
  }
  return count;
}

export function searchIndex(
  index: SearchIndex,
  query: ParsedQuery,
  limit = 100
): { total: number; hits: SearchHit[] } {
  const needles = [...query.phrases, ...query.terms];
  if (query.tooShort || !needles.length) return { total: 0, hits: [] };

  const multiWord = query.full.includes(' ');
  const hits: SearchHit[] = [];

  for (let i = 0; i < index.texts.length; i++) {
    const text = index.texts[i];
    let score = 0;
    for (const needle of needles) {
      const occ = countOccurrences(text, needle);
      if (!occ) {
        score = 0;
        break;
      }
      score += occ;
    }
    if (score > 0) {
      hits.push({
        row: index.rows[i],
        phrase: multiWord && text.includes(query.full),
        count: score,
      });
    }
  }

  hits.sort(
    (a, b) => Number(b.phrase) - Number(a.phrase) || b.count - a.count || a.row[0] - b.row[0]
  );

  return {
    total: hits.length,
    hits: hits.length > limit ? hits.slice(0, limit) : hits,
  };
}

function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const prev = out[out.length - 1];
    if (prev && start <= prev[1]) {
      prev[1] = Math.max(prev[1], end);
    } else {
      out.push([start, end]);
    }
  }
  return out;
}

export function highlightMatches(
  originalText: string,
  terms: readonly string[],
  lang: SearchLang
): Array<{ text: string; mark: boolean }> {
  const { text: norm, map } = normalizeText(lang, originalText);
  const rawSpans: Array<[number, number]> = [];

  for (const term of terms) {
    if (!term) continue;
    for (let pos = norm.indexOf(term); pos >= 0; pos = norm.indexOf(term, pos + 1)) {
      rawSpans.push([pos, pos + term.length]);
    }
  }

  const origSpans = mergeIntervals(
    mergeIntervals(rawSpans).map(([s, e]) => {
      const start = map[s] ?? 0;
      let end = e < map.length ? map[e] : originalText.length;
      while (end > start && NON_WORD_RE.test(originalText[end - 1])) {
        end -= 1;
      }
      return [start, end] as [number, number];
    })
  );

  const chunks: Array<{ text: string; mark: boolean }> = [];
  let cursor = 0;
  for (const [s, e] of origSpans) {
    if (s > cursor) chunks.push({ text: originalText.slice(cursor, s), mark: false });
    if (e > s) chunks.push({ text: originalText.slice(s, e), mark: true });
    cursor = Math.max(cursor, e);
  }
  if (cursor < originalText.length) {
    chunks.push({ text: originalText.slice(cursor), mark: false });
  }
  return chunks;
}
