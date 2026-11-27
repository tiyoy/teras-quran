import { signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'tq:theme';
export const themeMode = signal<ThemeMode>(readStorage<ThemeMode>(KEY, 'system'));
export const resolvedDark = signal<boolean>(false);

function computeDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyTheme(mode: ThemeMode = themeMode.value): void {
  const isDark = computeDark(mode);
  resolvedDark.value = isDark;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }
}

export function setThemeMode(mode: ThemeMode): void {
  themeMode.value = mode;
  writeStorage(KEY, mode);
  applyTheme(mode);
}

export function toggleTheme(): void {
  setThemeMode(resolvedDark.value ? 'light' : 'dark');
}

if (typeof window !== 'undefined') {
  applyTheme(themeMode.value);
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (themeMode.value === 'system') applyTheme('system');
  });
}
