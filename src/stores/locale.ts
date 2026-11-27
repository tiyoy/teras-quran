import { signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import { translate, type Locale } from '@/data/i18n';

const KEY = 'tq:locale';
const initial = readStorage<Locale>(KEY, 'id');
export const locale = signal<Locale>(initial === 'en' ? 'en' : 'id');

export function setLocale(next: Locale): void {
  locale.value = next;
  writeStorage(KEY, next);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next;
  }
}

export function t(key: string, params?: Record<string, string | number>): string {
  return translate(locale.value, key, params);
}
