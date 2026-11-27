import { useEffect, useMemo, useState } from 'preact/hooks';
import { Search, SearchX, Star, X } from 'lucide-preact';
import { fetchQuranMeta, type SurahMeta } from '@/lib/quran/api';
import { isSurahSaved, toggleSavedSurah } from '@/stores/library';
import { Rosette } from '@/components/ui/Rosette';
import { Button, EmptyState, PageHeader } from '@/components/ui/Primitives';

export function SurahListView() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Makkiyah' | 'Madaniyah'>('all');

  useEffect(() => {
    fetchQuranMeta()
      .then((m) => {
        setSurahs(m.surahs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surahs.filter((s) => {
      if (filter !== 'all' && s.revelation !== filter) return false;
      if (!q) return true;
      return (
        String(s.id) === q ||
        s.name.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q) ||
        s.englishName.toLowerCase().includes(q)
      );
    });
  }, [surahs, query, filter]);

  return (
    <div>
      <PageHeader
        title="Surah"
        description="114 surah Al-Qur'an lengkap dengan teks Arab, latin, terjemahan, tafsir, dan audio murottal."
      />

      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Cari nama, arti, atau nomor surah…"
            aria-label="Cari surah"
            class="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] pl-10 pr-9 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer"
            >
              <X class="size-3.5" />
            </button>
          )}
        </div>

        <div class="inline-flex rounded-xl bg-[var(--muted)] p-1">
          {(['all', 'Makkiyah', 'Madaniyah'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              class={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                filter === tab
                  ? 'bg-[var(--card)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab === 'all' ? 'Semua' : tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} class="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX class="size-5" />}
          title="Surah tidak ditemukan"
          description="Coba kata kunci lain atau ubah filter golongan."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Reset filter
            </Button>
          }
        />
      ) : (
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const starred = isSurahSaved(s.id);
            return (
              <div
                key={s.id}
                class="group relative flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[var(--primary)]"
              >
                <a
                  href={`/app/baca/${s.id}`}
                  class="flex min-w-0 flex-1 items-center gap-3 no-underline"
                >
                  <Rosette number={s.id} size="md" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
                      {s.name}
                    </p>
                    <p class="truncate text-xs text-[var(--muted-foreground)]">
                      {s.meaning} · {s.ayahCount} ayat
                    </p>
                  </div>
                  <span
                    class="quran-text shrink-0 text-lg text-[var(--foreground)]"
                    dir="rtl"
                    lang="ar"
                  >
                    {s.arabicName}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => toggleSavedSurah(s.id)}
                  aria-label={starred ? 'Hapus dari surah pilihan' : 'Simpan ke surah pilihan'}
                  class="shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer"
                >
                  <Star class={`size-4 ${starred ? 'fill-current text-[var(--gold)]' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
