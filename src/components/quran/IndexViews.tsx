import { useEffect, useState } from 'preact/hooks';
import { Sparkles } from 'lucide-preact';
import { fetchQuranMeta, type QuranMetaData } from '@/lib/quran/api';
import { Rosette } from '@/components/ui/Rosette';
import { Badge, Button, PageHeader } from '@/components/ui/Primitives';

export function QuranIndexView({
  kind,
}: {
  kind: 'juz' | 'halaman' | 'manzil' | 'ruku' | 'sajda';
}) {
  const [meta, setMeta] = useState<QuranMetaData | null>(null);
  const [filterNum, setFilterNum] = useState('');
  const [limit, setLimit] = useState(120);

  useEffect(() => {
    fetchQuranMeta().then(setMeta).catch(() => {});
  }, []);

  if (!meta) {
    return (
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} class="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)]" />
        ))}
      </div>
    );
  }

  if (kind === 'juz') {
    return (
      <div>
        <PageHeader
          title="Juz"
          description="Al-Qur'an dibagi menjadi 30 juz yang hampir sama panjang."
        />
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meta.juzs.map((j) => (
            <a
              key={j.juz}
              href={`/app/baca/${j.surah}?ayat=${j.ayah}`}
              class="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)] no-underline"
            >
              <Rosette number={j.juz} />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-[var(--foreground)]">Juz {j.juz}</p>
                <p class="truncate text-xs text-[var(--muted-foreground)]">
                  Mulai QS. {j.surahName} : {j.ayah}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'manzil') {
    return (
      <div>
        <PageHeader
          title="Manzil"
          description="Tujuh bagian Al-Qur'an untuk mengkhatamkannya dalam satu pekan."
        />
        <div class="grid gap-3 sm:grid-cols-2">
          {meta.manzils.map((m) => (
            <a
              key={m.manzil}
              href={`/app/baca/${m.surah}?ayat=${m.ayah}`}
              class="flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)] no-underline"
            >
              <Rosette number={m.manzil} />
              <div>
                <p class="text-sm font-semibold text-[var(--foreground)]">
                  Manzil {m.manzil} · Hari ke-{m.manzil}
                </p>
                <p class="text-xs text-[var(--muted-foreground)]">
                  Mulai QS. {m.surahName} ({m.surah}:{m.ayah})
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'sajda') {
    return (
      <div>
        <PageHeader
          title="Ayat Sajdah"
          description="15 ayat sajdah, tempat disunahkan atau diwajibkan sujud tilawah saat membacanya."
        />
        <div class="grid gap-3 sm:grid-cols-2">
          {meta.sajdas.map((s) => (
            <a
              key={s.id}
              href={`/app/baca/${s.surah}?ayat=${s.ayah}`}
              class="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)] no-underline"
            >
              <div class="flex items-center gap-3">
                <Rosette number={s.id} />
                <div>
                  <p class="text-sm font-semibold text-[var(--foreground)]">
                    {s.surahName} · Ayat {s.ayah}
                  </p>
                  <p class="text-xs text-[var(--muted-foreground)]">
                    QS. {s.surah}:{s.ayah}
                  </p>
                </div>
              </div>
              <Badge variant={s.obligatory ? 'primary' : 'gold'}>
                <Sparkles class="size-3" />
                {s.obligatory ? 'Wajib' : 'Dianjurkan'}
              </Badge>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'halaman') {
    const qNum = Number(filterNum);
    const items = qNum >= 1 && qNum <= 604
      ? meta.pages.filter((p) => p.page === qNum)
      : meta.pages.slice(0, limit);

    return (
      <div>
        <PageHeader
          title="Halaman Mushaf"
          description="604 halaman mushaf standar Madinah. Ketuk halaman untuk membaca dalam tampilan mushaf."
        />
        <form
          class="mb-5 flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (qNum >= 1 && qNum <= 604) window.location.href = `/app/halaman/${qNum}`;
          }}
        >
          <input
            id="index-page-filter"
            name="pageNumber"
            type="number"
            min={1}
            max={604}
            value={filterNum}
            onInput={(e) => setFilterNum((e.target as HTMLInputElement).value)}
            placeholder="Nomor halaman (1–604)…"
            aria-label="Saring nomor halaman"
            class="h-10 flex-1 rounded-xl border border-[var(--input)] bg-[var(--card)] px-3 text-sm tabular-nums focus:border-[var(--primary)] focus:outline-none"
          />
          <Button type="submit" size="md" disabled={!(qNum >= 1 && qNum <= 604)}>
            Buka
          </Button>
        </form>

        <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <a
              key={p.page}
              href={`/app/halaman/${p.page}`}
              class="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[var(--primary)] no-underline"
            >
              <Rosette number={p.page} size="sm" />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-[var(--foreground)]">Halaman {p.page}</p>
                <p class="truncate text-xs text-[var(--muted-foreground)]">
                  {p.surahName} : {p.ayah}
                </p>
              </div>
            </a>
          ))}
        </div>

        {!filterNum && limit < meta.pages.length && (
          <div class="mt-5 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 120)}>
              Muat halaman berikutnya ({meta.pages.length - limit} tersisa)
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Ruku (556)
  const qRuku = Number(filterNum);
  const rukuItems = qRuku >= 1 && qRuku <= 556
    ? meta.rukus.filter((r) => r.ruku === qRuku)
    : meta.rukus.slice(0, limit);

  return (
    <div>
      <PageHeader
        title="Ruku"
        description="556 ruku — kelompok ayat yang membahas satu pokok bahasan."
      />
      <div class="mb-5 max-w-xs">
        <input
          id="index-ruku-filter"
          name="rukuNumber"
          type="number"
          min={1}
          max={556}
          value={filterNum}
          onInput={(e) => setFilterNum((e.target as HTMLInputElement).value)}
          placeholder="Saring nomor ruku (1–556)…"
          aria-label="Saring nomor ruku"
          class="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] px-3 text-sm tabular-nums focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {rukuItems.map((r) => (
          <a
            key={r.ruku}
            href={`/app/baca/${r.surah}?ayat=${r.ayah}`}
            class="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[var(--primary)] no-underline"
          >
            <Rosette number={r.ruku} size="sm" />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[var(--foreground)]">Ruku {r.ruku}</p>
              <p class="truncate text-xs text-[var(--muted-foreground)]">
                {r.surahName} : {r.ayah}
              </p>
            </div>
          </a>
        ))}
      </div>

      {!filterNum && limit < meta.rukus.length && (
        <div class="mt-5 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 120)}>
            Muat ruku berikutnya ({meta.rukus.length - limit} tersisa)
          </Button>
        </div>
      )}
    </div>
  );
}
