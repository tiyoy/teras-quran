import { useMemo, useState } from 'preact/hooks';
import { Search, SearchX, X } from 'lucide-preact';
import { GUIDE_TOPICS, type GuideTopic } from '@/data/guide-topics';
import { Badge, Button, Card, EmptyState } from '@/components/ui/Primitives';

const CATEGORIES = [
  'Semua',
  'Membaca',
  'Audio & Offline',
  'Pribadi & Hafalan',
  'Ibadah & Tasbih',
  'Akun & Privasi',
] as const;

export function GuideFilter() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Semua');

  const filtered = useMemo<GuideTopic[]>(() => {
    const q = query.trim().toLowerCase();
    return GUIDE_TOPICS.filter((topic) => {
      if (category !== 'Semua' && topic.category !== category) return false;
      if (!q) return true;
      return (
        topic.title.toLowerCase().includes(q) ||
        topic.summary.toLowerCase().includes(q) ||
        topic.steps.some((s) => s.toLowerCase().includes(q)) ||
        topic.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div class="space-y-6">
      <div class="space-y-3">
        <div class="relative">
          <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Contoh: murajaah, tajwid, tasbih, unduh offline"
            aria-label="Cari di panduan"
            class="h-11 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] pl-10 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer"
            >
              <X class="size-4" />
            </button>
          )}
        </div>

        <div class="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              class={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                category === cat
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX class="size-5" />}
          title={`Tidak ada topik yang cocok dengan "${query}"`}
          description="Coba kata kunci lain atau tampilkan semua topik panduan."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery('');
                setCategory('Semua');
              }}
            >
              Tampilkan semua topik
            </Button>
          }
        />
      ) : (
        <div class="space-y-4">
          {filtered.map((topic) => (
            <Card key={topic.id} class="p-5 sm:p-6">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="primary">{topic.category}</Badge>
              </div>
              <h2 class="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                {topic.title}
              </h2>
              <p class="mt-1 text-sm text-[var(--muted-foreground)]">{topic.summary}</p>
              <div class="mt-4">
                <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Langkah
                </p>
                <ol class="space-y-2 text-sm text-[var(--foreground)]">
                  {topic.steps.map((step, i) => (
                    <li key={i} class="flex gap-2.5">
                      <span class="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-foreground)] tabular-nums">
                        {i + 1}
                      </span>
                      <span class="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {topic.notes && topic.notes.length > 0 && (
                <div class="mt-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-3.5 text-xs text-[var(--muted-foreground)]">
                  <p class="mb-1 font-semibold text-[var(--foreground)]">Perlu diketahui</p>
                  <ul class="list-disc space-y-1 pl-4">
                    {topic.notes.map((n, idx) => (
                      <li key={idx}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
