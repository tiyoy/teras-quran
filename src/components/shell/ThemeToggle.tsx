import { Moon, Sun } from 'lucide-preact';
import { resolvedDark, toggleTheme } from '@/stores/theme';

export function ThemeToggle() {
  const isDark = resolvedDark.value;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      class="inline-flex size-9 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
    >
      {isDark ? <Sun class="size-[18px]" /> : <Moon class="size-[18px]" />}
    </button>
  );
}
