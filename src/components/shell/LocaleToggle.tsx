import { useEffect, useState } from 'preact/hooks';
import { Languages } from 'lucide-preact';
import { applyDomLocale, locale, setLocale } from '@/stores/locale';

export function LocaleToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cur = mounted ? locale.value : 'id';

  useEffect(() => {
    if (mounted) applyDomLocale(cur);
  }, [mounted, cur]);

  return (
    <button
      type="button"
      onClick={() => setLocale(cur === 'id' ? 'en' : 'id')}
      aria-label={cur === 'id' ? 'Ubah bahasa ke English' : 'Switch language to Indonesian'}
      title={
        cur === 'id'
          ? 'Bahasa: Indonesia (klik untuk English)'
          : 'Language: English (click for Indonesian)'
      }
      class="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
    >
      <Languages class="size-4" />
      <span class="uppercase">{cur}</span>
    </button>
  );
}
