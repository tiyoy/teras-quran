import { Languages } from 'lucide-preact';
import { locale, setLocale } from '@/stores/locale';

export function LocaleToggle() {
  const cur = locale.value;
  return (
    <button
      type="button"
      onClick={() => setLocale(cur === 'id' ? 'en' : 'id')}
      aria-label="Ubah bahasa"
      title={cur === 'id' ? 'Bahasa: Indonesia (klik untuk English)' : 'Language: English (click for Indonesian)'}
      class="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
    >
      <Languages class="size-4" />
      <span class="uppercase">{cur}</span>
    </button>
  );
}
