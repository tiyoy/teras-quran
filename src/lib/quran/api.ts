import { fromGlobalAyah, toGlobalAyah, TOTAL_AYAHS } from './meta';
import type { TajwidSegment } from './tajwid-parser';
import type { SearchLang, SearchRow } from './search-logic';

export const QURAN_BASE_PATH = '/quran/v1';
export const QURAN_OFFLINE_CACHE = 'tq-quran-offline-v1';

export interface SurahMeta {
  id: number;
  name: string;
  arabicName: string;
  arabicFull: string;
  meaning: string;
  englishName: string;
  englishMeaning: string;
  revelation: 'Makkiyah' | 'Madaniyah';
  revelationEn: 'Meccan' | 'Medinan';
  ayahCount: number;
  description: string;
}

export interface JuzRef {
  juz: number;
  surah: number;
  ayah: number;
  surahName: string;
}

export interface PageRef {
  page: number;
  surah: number;
  ayah: number;
  surahName: string;
}

export interface ManzilRef {
  manzil: number;
  surah: number;
  ayah: number;
  surahName: string;
}

export interface RukuRef {
  ruku: number;
  surah: number;
  ayah: number;
  surahName: string;
}

export interface SajdaRef {
  id: number;
  surah: number;
  ayah: number;
  surahName: string;
  obligatory: boolean;
  recommended: boolean;
}

export interface QuranMetaData {
  surahs: SurahMeta[];
  juzs: JuzRef[];
  pages: PageRef[];
  manzils: ManzilRef[];
  rukus: RukuRef[];
  sajdas: SajdaRef[];
}

export interface RawAyah {
  i: number;
  n: number;
  ar: string;
  tr: string;
  tid: string;
  ten: string;
  juz: number;
  page: number;
  ruku: number;
  manzil: number;
  hizb: number;
  sajda: boolean;
}

export interface Ayah extends RawAyah {
  surahId: number;
}

export interface TafsirItem {
  n: number;
  short: string;
  long: string;
}

export interface TajwidSurahData {
  surah: number;
  items: Array<{ n: number; segments: TajwidSegment[] }>;
}

const memoryCache = new Map<string, Promise<unknown>>();

async function fetchCachedJson<T>(url: string): Promise<T> {
  const existing = memoryCache.get(url);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    if (typeof caches !== 'undefined') {
      try {
        const hit =
          (await caches.match(url, { cacheName: QURAN_OFFLINE_CACHE, ignoreSearch: true })) ||
          (await caches.match(url, { ignoreSearch: true }));
        if (hit) return (await hit.json()) as T;
      } catch {
        // Ignore cache lookup failure
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    if (typeof caches !== 'undefined') {
      caches
        .open(QURAN_OFFLINE_CACHE)
        .then((c) => c.put(url, res.clone()))
        .catch(() => {});
    }
    return (await res.json()) as T;
  })();

  promise.catch(() => memoryCache.delete(url));
  memoryCache.set(url, promise);
  return promise;
}

export function fetchQuranMeta(): Promise<QuranMetaData> {
  return fetchCachedJson<QuranMetaData>(`${QURAN_BASE_PATH}/meta.json`);
}

export async function fetchSurahAyahs(surahId: number): Promise<Ayah[]> {
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) return [];
  const data = await fetchCachedJson<{ surah: number; ayahs: RawAyah[] }>(
    `${QURAN_BASE_PATH}/surah/${surahId}.json`
  );
  return data.ayahs.map((a) => ({ ...a, surahId }));
}

export async function fetchAyahRangeByGlobal(startGlobal: number, endGlobal: number): Promise<Ayah[]> {
  const s = Math.max(1, Math.trunc(startGlobal));
  const e = Math.min(TOTAL_AYAHS, Math.trunc(endGlobal));
  if (s > e) return [];
  const first = fromGlobalAyah(s);
  const last = fromGlobalAyah(e);
  if (!first || !last) return [];
  const surahIds = Array.from({ length: last.surah - first.surah + 1 }, (_, i) => first.surah + i);
  const lists = await Promise.all(surahIds.map(fetchSurahAyahs));
  return lists.flat().filter((a) => a.i >= s && a.i <= e);
}

export async function fetchAyahsByGlobalIds(ids: readonly number[]): Promise<Ayah[]> {
  const uniqueIds = [...new Set(ids)];
  const surahIds = [
    ...new Set(uniqueIds.map((id) => fromGlobalAyah(id)?.surah ?? 0).filter(Boolean)),
  ];
  const map = new Map<number, Ayah>();
  const surahs = await Promise.all(surahIds.map(fetchSurahAyahs));
  for (const list of surahs) {
    for (const a of list) map.set(a.i, a);
  }
  return uniqueIds.flatMap((id) => {
    const found = map.get(id);
    return found ? [found] : [];
  });
}

export async function fetchMushafPageAyahs(pageNumber: number): Promise<Ayah[]> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) return [];
  const meta = await fetchQuranMeta();
  const idx = meta.pages.findIndex((p) => p.page === pageNumber);
  const cur = meta.pages[idx];
  if (!cur) return [];
  const next = meta.pages[idx + 1];
  const startGlobal = toGlobalAyah(cur.surah, cur.ayah);
  const endGlobal = next ? toGlobalAyah(next.surah, next.ayah) - 1 : TOTAL_AYAHS;
  return fetchAyahRangeByGlobal(startGlobal, endGlobal);
}

export async function fetchSurahTafsir(surahId: number): Promise<TafsirItem[]> {
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) return [];
  const data = await fetchCachedJson<{ surah: number; items: TafsirItem[] }>(
    `${QURAN_BASE_PATH}/tafsir/${surahId}.json`
  );
  return data.items;
}

export async function fetchSurahTajwid(surahId: number): Promise<Map<number, TajwidSegment[]>> {
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) return new Map();
  const data = await fetchCachedJson<TajwidSurahData>(`${QURAN_BASE_PATH}/tajwid/${surahId}.json`);
  return new Map(data.items.map((it) => [it.n, it.segments]));
}

export function fetchSearchRows(lang: SearchLang): Promise<SearchRow[]> {
  return fetchCachedJson<SearchRow[]>(`${QURAN_BASE_PATH}/search/${lang}.json`);
}

/** Deterministic ayah of the day based on local YYYY-MM-DD */
export function getDailyAyahGlobalId(date: Date = new Date()): number {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  // LCG hash to spread across all 6236 ayahs cleanly
  const hashed = Math.abs((seed * 2654435761) >>> 0);
  return (hashed % TOTAL_AYAHS) + 1;
}
