import { useEffect, useState } from 'preact/hooks';
import { Moon, Sun } from 'lucide-preact';
import { resolvedDark, toggleTheme } from '@/stores/theme';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedDark.value : false;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      class="inline-flex size-9 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
    >
      <Sun class="hidden size-[18px] dark:block" aria-hidden="true" />
      <Moon class="block size-[18px] dark:hidden" aria-hidden="true" />
    </button>
  );
}
