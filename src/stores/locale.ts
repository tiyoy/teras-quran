import { signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import { translate, type Locale } from '@/data/i18n';

const KEY = 'tq:locale';
const LOCALE_EVENT = 'tq:locale-change';

const initial = readStorage<Locale>(KEY, 'id');
export const locale = signal<Locale>(initial === 'en' ? 'en' : 'id');

export function applyDomLocale(next: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = next;
  const nodes = document.querySelectorAll<HTMLElement>('[data-i18n]');
  for (const el of nodes) {
    const key = el.dataset.i18n;
    if (key) {
      el.textContent = translate(next, key);
    }
  }
}

export function setLocale(next: Locale): void {
  locale.value = next;
  writeStorage(KEY, next);
  applyDomLocale(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<Locale>(LOCALE_EVENT, { detail: next }));
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(LOCALE_EVENT, (ev) => {
    const next = (ev as CustomEvent<Locale>).detail;
    if ((next === 'id' || next === 'en') && locale.value !== next) {
      locale.value = next;
    }
  });
  window.addEventListener('storage', (ev) => {
    if (ev.key === KEY && ev.newValue) {
      try {
        const parsed = JSON.parse(ev.newValue);
        if ((parsed === 'id' || parsed === 'en') && locale.value !== parsed) {
          locale.value = parsed;
          applyDomLocale(parsed);
        }
      } catch {
        // ignore malformed storage value
      }
    }
  });
}

export function t(key: string, params?: Record<string, string | number>): string {
  return translate(locale.value, key, params);
}
