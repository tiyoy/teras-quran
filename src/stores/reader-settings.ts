import { signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import type { Ayah } from '@/lib/quran/api';

export interface ReaderSettings {
  arabicSize: number;
  latinSize: number;
  translationSize: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  translationLang: 'id' | 'en';
  hideArabic: boolean;
  viewMode: 'card' | 'page';
  tajwid: boolean;
}

export const ARABIC_SIZE_LIMITS = { min: 22, max: 44, step: 2, default: 30 } as const;
export const LATIN_SIZE_LIMITS = { min: 12, max: 24, step: 1, default: 14 } as const;
export const TRANSLATION_SIZE_LIMITS = { min: 12, max: 24, step: 1, default: 15 } as const;

const KEY = 'tq:reader';

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  arabicSize: ARABIC_SIZE_LIMITS.default,
  latinSize: LATIN_SIZE_LIMITS.default,
  translationSize: TRANSLATION_SIZE_LIMITS.default,
  showTranslation: true,
  showTransliteration: true,
  translationLang: 'id',
  hideArabic: false,
  viewMode: 'card',
  tajwid: false,
};

export const readerSettings = signal<ReaderSettings>({
  ...DEFAULT_READER_SETTINGS,
  ...readStorage<Partial<ReaderSettings>>(KEY, {}),
});

export function updateReaderSettings(patch: Partial<ReaderSettings>): void {
  const next = { ...readerSettings.value, ...patch };
  readerSettings.value = next;
  writeStorage(KEY, next);
}

export function resetReaderSettings(): void {
  const next = { ...DEFAULT_READER_SETTINGS, viewMode: readerSettings.value.viewMode };
  readerSettings.value = next;
  writeStorage(KEY, next);
}

export function getTranslationText(ayah: Pick<Ayah, 'tid' | 'ten'>): string {
  return readerSettings.value.translationLang === 'en' && ayah.ten ? ayah.ten : ayah.tid;
}
