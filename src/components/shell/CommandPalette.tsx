import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BookOpen, CornerDownLeft, Search, X } from 'lucide-preact';
import { fetchQuranMeta, type SurahMeta } from '@/lib/quran/api';
import { parseVerseReference } from '@/lib/quran/search-logic';
import { ALL_NAV_ITEMS } from './nav-items';

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 20);
    fetchQuranMeta()
      .then((m) => setSurahs(m.surahs))
      .catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const trimmed = query.trim().toLowerCase();

  const directRef = useMemo(() => {
    if (!trimmed || !surahs.length) return null;
    return parseVerseReference(query, surahs);
  }, [query, trimmed, surahs]);

  const matchedMenus = useMemo(() => {
    if (!trimmed) return ALL_NAV_ITEMS.slice(0, 8);
    return ALL_NAV_ITEMS.filter(
      (it) =>
        it.label.toLowerCase().includes(trimmed) ||
        it.description.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  const matchedSurahs = useMemo(() => {
    if (!trimmed) return surahs.slice(0, 6);
    return surahs
      .filter(
        (s) =>
          String(s.id) === trimmed ||
          s.name.toLowerCase().includes(trimmed) ||
          s.meaning.toLowerCase().includes(trimmed)
      )
      .slice(0, 8);
  }, [trimmed, surahs]);

  if (!open) return null;

  const directSurah = directRef ? surahs.find((s) => s.id === directRef.surah) : null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Cari menu atau surah"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)]">
        <div class="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3">
          <Search class="size-4 shrink-0 text-[var(--muted-foreground)]" />
          <input
            ref={inputRef}
            id="command-palette-search"
            name="commandQuery"
            type="text"
            aria-label="Cari menu, nama surah, atau ayat"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (directRef) {
                  window.location.href = `/app/baca/${directRef.surah}?ayat=${directRef.ayah}`;
                  onClose();
                } else if (matchedSurahs.length && trimmed) {
                  window.location.href = `/app/baca/${matchedSurahs[0].id}`;
                  onClose();
                } else if (matchedMenus.length && trimmed) {
                  window.location.href = matchedMenus[0].href;
                  onClose();
                }
              }
            }}
            placeholder="Cari menu, nama surah, atau ayat (mis. 2:255)…"
            class="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              class="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer"
            >
              <X class="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            class="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer"
          >
            Esc
          </button>
        </div>

        <div class="max-h-[60dvh] overflow-y-auto p-2">
          {directRef && directSurah && (
            <div class="mb-2">
              <p class="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Lompat ke ayat
              </p>
              <a
                href={`/app/baca/${directRef.surah}?ayat=${directRef.ayah}`}
                onClick={onClose}
                class="flex items-center justify-between rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-[var(--accent-foreground)] no-underline"
              >
                <span class="flex items-center gap-2.5">
                  <BookOpen class="size-4 text-[var(--primary)]" />
                  Buka QS. {directSurah.name} {directRef.surah}:{directRef.ayah}
                </span>
                <CornerDownLeft class="size-3.5 opacity-70" />
              </a>
            </div>
          )}

          {trimmed.length >= 3 && (
            <a
              href={`/app/cari?q=${encodeURIComponent(query.trim())}`}
              onClick={onClose}
              class="mb-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--primary)] hover:bg-[var(--muted)] no-underline"
            >
              <span class="flex items-center gap-2">
                <Search class="size-4" />
                Cari &ldquo;{query.trim()}&rdquo; di seluruh Al-Qur&apos;an
              </span>
              <CornerDownLeft class="size-3.5" />
            </a>
          )}

          {matchedMenus.length > 0 && (
            <div class="mb-2">
              <p class="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Menu
              </p>
              {matchedMenus.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] no-underline"
                  >
                    <Icon class="size-4 shrink-0 text-[var(--muted-foreground)]" />
                    <span class="font-medium">{item.label}</span>
                    <span class="ml-auto truncate text-xs text-[var(--muted-foreground)]">
                      {item.description}
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          {matchedSurahs.length > 0 && (
            <div>
              <p class="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Surah
              </p>
              {matchedSurahs.map((s) => (
                <a
                  key={s.id}
                  href={`/app/baca/${s.id}`}
                  onClick={onClose}
                  class="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] no-underline"
                >
                  <span class="flex items-center gap-2.5">
                    <span class="w-7 text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">
                      {s.id}.
                    </span>
                    <span class="font-medium">{s.name}</span>
                    <span class="text-xs text-[var(--muted-foreground)]">
                      {s.meaning} · {s.ayahCount} ayat
                    </span>
                  </span>
                  <span class="quran-text text-base text-[var(--muted-foreground)]" dir="rtl" lang="ar">
                    {s.arabicName}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
