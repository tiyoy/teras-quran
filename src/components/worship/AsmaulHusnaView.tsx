import { useMemo, useState } from 'preact/hooks';
import { Quote, Search, SearchX, X } from 'lucide-preact';
import { ASMAUL_HUSNA } from '@/data/asmaul-husna';
import { locale } from '@/stores/locale';
import { Rosette } from '@/components/ui/Rosette';
import { Button, Card, EmptyState, PageHeader } from '@/components/ui/Primitives';

export function AsmaulHusnaView() {
  const [query, setQuery] = useState('');
  const lang = locale.value;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ASMAUL_HUSNA;
    return ASMAUL_HUSNA.filter(
      (item) =>
        String(item.number) === q ||
        item.latin.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.en.toLowerCase().includes(q) ||
        item.arabic.includes(q)
    );
  }, [query]);

  return (
    <div class="space-y-5">
      <PageHeader
        title="Asmaul Husna"
        description="99 nama Allah yang indah, dengan tulisan Arab, bacaan latin, dan artinya."
      />

      <Card class="flex gap-3 p-4 sm:p-5">
        <Quote class="mt-0.5 size-5 shrink-0 text-[var(--primary)]" />
        <div class="text-sm">
          <p class="leading-relaxed text-[var(--foreground)]">
            &ldquo;Sesungguhnya Allah memiliki sembilan puluh sembilan nama, seratus kurang satu. Barang siapa menghafalnya, ia masuk surga.&rdquo;
          </p>
          <p class="mt-1 text-xs text-[var(--muted-foreground)]">
            HR. al-Bukhari no. 7392 dan Muslim no. 2677
          </p>
        </div>
      </Card>

      <div class="relative max-w-md">
        <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          type="text"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Cari nama, arti, atau nomor (1–99)…"
          aria-label="Cari Asmaul Husna"
          class="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] pl-10 pr-9 text-sm focus:border-[var(--primary)] focus:outline-none"
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

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX class="size-5" />}
          title="Nama tidak ditemukan"
          description='Coba kata lain, misalnya "Rahman", "Pengasih", atau nomor 1 sampai 99.'
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery('')}>
              Tampilkan semua
            </Button>
          }
        />
      ) : (
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.number} class="p-4">
              <div class="mb-3 flex items-start justify-between gap-2">
                <Rosette number={item.number} size="sm" />
                <p class="quran-text text-right text-2xl text-[var(--primary)]" dir="rtl" lang="ar">
                  {item.arabic}
                </p>
              </div>
              <p class="text-sm font-bold text-[var(--foreground)]">{item.latin}</p>
              <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {lang === 'en' ? item.en : item.id}
              </p>
            </Card>
          ))}
        </div>
      )}

      <p class="text-xs leading-relaxed text-[var(--muted-foreground)]">
        Urutan dan tulisan Arab mengikuti riwayat at-Tirmidzi no. 3507, dengan al-Ahad sebagai nama ke-67 seperti pada daftar yang umum dipakai.
      </p>
    </div>
  );
}
