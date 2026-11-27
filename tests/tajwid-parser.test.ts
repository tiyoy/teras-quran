import { describe, it, expect } from 'vitest';
import {
  TAJWID_GROUPS,
  parseTajweedMarkup,
  tajwidClassName,
  type TajwidGroup,
} from '@/lib/quran/tajwid-parser';

describe('tajwid-parser', () => {
  it('exposes all 12 tajwid groups', () => {
    expect(TAJWID_GROUPS).toHaveLength(12);
    expect(TAJWID_GROUPS).toContain('ghunnah');
    expect(TAJWID_GROUPS).toContain('silent');
  });

  it('converts group id to CSS class name', () => {
    expect(tajwidClassName('madWajibJaiz')).toBe('tajwid-mad-wajib-jaiz');
    expect(tajwidClassName('idghamBigunnah')).toBe('tajwid-idgham-bigunnah');
    expect(tajwidClassName('ghunnah')).toBe('tajwid-ghunnah');
  });

  it('parses Al-Fatihah ayah 1 markup accurately while preserving all Arabic letters', () => {
    const raw =
      'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';
    const segments = parseTajweedMarkup(raw);
    const reconstructed = segments.map(([text]) => text).join('');
    expect(reconstructed).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ');

    const groups = segments.filter(([, g]) => g !== null).map(([, g]) => g);
    expect(groups).toContain('silent');
    expect(groups).toContain('madThabii');
    expect(groups).toContain('madArid');
  });

  it('maps every alquran.cloud tajweed rule code to one of the 12 groups', () => {
    const cases: Array<[string, TajwidGroup]> = [
      ['[g[نّ]', 'ghunnah'],
      ['[f:1[ن]', 'ikhfa'],
      ['[c:1[م]', 'ikhfa'],
      ['[a:1[ن]', 'idghamBigunnah'],
      ['[w:1[م]', 'idghamBigunnah'],
      ['[u:1[ن]', 'idghamBilagunnah'],
      ['[d:1[ت]', 'idghamMutajanisain'],
      ['[b:1[ل]', 'idghamMutajanisain'],
      ['[i:1[نۢ]', 'iqlab'],
      ['[q:1[قْ]', 'qalqalah'],
      ['[n[ـٰ]', 'madThabii'],
      ['[o[آ]', 'madWajibJaiz'],
      ['[p[ِي]', 'madArid'],
      ['[m[َآ]', 'madLazim'],
      ['[h:1[ٱ]', 'silent'],
      ['[l[ل]', 'silent'],
      ['[s[ا]', 'silent'],
    ];

    for (const [markup, expectedGroup] of cases) {
      const segs = parseTajweedMarkup(markup);
      expect(segs).toHaveLength(1);
      expect(segs[0][1]).toBe(expectedGroup);
    }
  });

  it('degrades unknown or malformed bracket markup safely without losing characters', () => {
    const unknown = parseTajweedMarkup('أَ[z:9[ب]تَ');
    expect(unknown.map(([t]) => t).join('')).toBe('أَب تَ'.replace(' ', ''));

    const unclosed = parseTajweedMarkup('قُلْ [h:1[ٱللَّهُ');
    expect(unclosed.map(([t]) => t).join('')).toContain('قُلْ ');
    expect(unclosed.map(([t]) => t).join('')).toContain('ٱللَّهُ');
  });
});
