import { describe, it, expect } from 'vitest';
import {
  buildSearchIndex,
  parseVerseReference,
  parseQuery,
  searchIndex,
  highlightMatches,
} from '@/lib/quran/search-logic';

const SAMPLE_SURAHS = [
  { id: 1, name: 'Al-Fatihah', englishName: 'Al-Faatiha' },
  { id: 2, name: 'Al-Baqarah', englishName: 'Al-Baqara' },
  { id: 36, name: 'Yasin', englishName: 'Yaseen' },
  { id: 112, name: 'Al-Ikhlas', englishName: 'Al-Ikhlaas' },
];

describe('search-logic', () => {
  it('parses valid direct verse references and rejects out-of-range ayahs', () => {
    expect(parseVerseReference('2:255', SAMPLE_SURAHS)).toEqual({ surah: 2, ayah: 255 });
    expect(parseVerseReference('QS. 1:7', SAMPLE_SURAHS)).toEqual({ surah: 1, ayah: 7 });
    expect(parseVerseReference('yasin 1', SAMPLE_SURAHS)).toEqual({ surah: 36, ayah: 1 });
    expect(parseVerseReference('baqarah:255', SAMPLE_SURAHS)).toEqual({ surah: 2, ayah: 255 });
    expect(parseVerseReference('al-ikhlas 4', SAMPLE_SURAHS)).toEqual({ surah: 112, ayah: 4 });
    // Out of bounds
    expect(parseVerseReference('2:287', SAMPLE_SURAHS)).toBeNull();
    expect(parseVerseReference('1:8', SAMPLE_SURAHS)).toBeNull();
    expect(parseVerseReference('115:1', SAMPLE_SURAHS)).toBeNull();
  });

  it('normalizes Indonesian sh/dz spelling and ranks exact quoted phrases first', () => {
    const idx = buildSearchIndex('id', [
      [1, 1, 1, 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.'],
      [160, 2, 153, 'Mohonlah pertolongan (kepada Allah) dengan sabar dan salat.'],
      [52, 2, 45, 'Jadikanlah sabar dan salat sebagai penolongmu.'],
      [100, 2, 93, 'Dirikanlah shalat dengan penuh sabar.'],
    ]);

    const q = parseQuery('"sabar dan shalat"', 'id');
    const res = searchIndex(idx, q);
    expect(res.total).toBe(2);
    expect(res.hits[0].row[0]).toBe(52);
  });

  it('matches Arabic text regardless of diacritics and alif wasla', () => {
    const idx = buildSearchIndex('ar', [
      [1, 1, 1, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'],
      [2, 1, 2, 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'],
    ]);

    const q = parseQuery('الرحمن الرحيم', 'ar');
    const res = searchIndex(idx, q);
    expect(res.total).toBe(1);
    expect(res.hits[0].row[0]).toBe(1);

    const chunks = highlightMatches('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', q.terms, 'ar');
    expect(chunks.some((c) => c.mark)).toBe(true);
    expect(chunks.map((c) => c.text).join('')).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
  });
});
