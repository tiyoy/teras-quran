import { useEffect, useMemo, useState } from 'preact/hooks';
import { ArrowRight, BookOpen, Search, SearchX, X } from 'lucide-preact';
import {
  fetchQuranMeta,
  fetchSearchRows,
  type SurahMeta,
} from '@/lib/quran/api';
import {
  buildSearchIndex,
  highlightMatches,
  isArabicQuery,
  parseQuery,
  parseVerseReference,
  searchIndex,
  type SearchIndex,
  type SearchLang,
} from '@/lib/quran/search-logic';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/Primitives';

const LANG_OPTIONS: Array<{ id: SearchLang; label: string }> = [
  { id: 'id', label: 'Indonesia' },
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'Arab' },
  { id: 'tr', label: 'Latin' },
];

export function SearchView() {
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<SearchLang>('id');
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [indexCache, setIndexCache] = useState<Partial<Record<SearchLang, SearchIndex>>>({});
  const [loadingIdx, setLoadingIdx] = useState(false);
  const [indexError, setIndexError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      setQuery(q);
      if (isArabicQuery(q)) setLang('ar');
    }
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, []);

  useEffect(() => {
    if (indexCache[lang]) {
      setIndexError(false);
      return;
    }
    let alive = true;
    setLoadingIdx(true);
    setIndexError(false);
    fetchSearchRows(lang)
      .then((rows) => {
        if (!alive) return;
        const built = buildSearchIndex(lang, rows);
        setIndexCache((prev) => ({ ...prev, [lang]: built }));
      })
      .catch(() => {
        if (alive) setIndexError(true);
      })
      .finally(() => {
        if (alive) setLoadingIdx(false);
      });
    return () => {
      alive = false;
    };
  }, [lang, indexCache, retryTick]);

  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs]);
  const directRef = useMemo(
    () => (query.trim() && surahs.length ? parseVerseReference(query, surahs) : null),
    [query, surahs]
  );

  const parsed = useMemo(() => parseQuery(query, lang), [query, lang]);
  const result = useMemo(() => {
    const idx = indexCache[lang];
    if (!idx || parsed.tooShort) return { total: 0, hits: [] };
    return searchIndex(idx, parsed, 80);
  }, [indexCache, lang, parsed]);

  const highlightTerms = [...parsed.phrases, ...parsed.terms];

  return (
    <div>
      <PageHeader
        title="Cari ayat"
        description="Cari kata dalam terjemahan, teks Arab (dengan atau tanpa harakat), bacaan latin, atau langsung lompat ke ayat (mis. 2:255)."
      />

      <div class="mb-5 space-y-3">
        <div class="relative">
          <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={query}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              setQuery(val);
              if (isArabicQuery(val) && lang !== 'ar') setLang('ar');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && directRef) {
                window.location.href = `/app/baca/${directRef.surah}?ayat=${directRef.ayah}`;
              }
            }}
            placeholder='Contoh: "sabar dan shalat", rahmat, 2:255, yasin 1'
            aria-label="Cari di Al-Qur'an"
            class="h-11 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] pl-10 pr-10 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
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

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="inline-flex rounded-xl bg-[var(--muted)] p-1">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLang(opt.id)}
                class={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  lang === opt.id
                    ? 'bg-[var(--card)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {!parsed.tooShort && !loadingIdx && (
            <span class="text-xs text-[var(--muted-foreground)] tabular-nums">
              {result.total} ayat ditemukan
            </span>
          )}
        </div>
      </div>

      {/* Direct verse reference card */}
      {directRef && (
        <a
          href={`/app/baca/${directRef.surah}?ayat=${directRef.ayah}`}
          class="mb-4 flex items-center justify-between rounded-xl border border-[var(--primary)] bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] no-underline"
        >
          <span class="flex items-center gap-2.5">
            <BookOpen class="size-4 text-[var(--primary)]" />
            Buka QS. {surahMap.get(directRef.surah)?.name ?? `Surah ${directRef.surah}`}{' '}
            {directRef.surah}:{directRef.ayah}
          </span>
          <ArrowRight class="size-4 text-[var(--primary)]" />
        </a>
      )}

      {parsed.tooShort ? (
        <EmptyState
          icon={<Search class="size-5" />}
          title="Ketik minimal 3 huruf"
          description='Harakat boleh ditulis atau tidak. Gunakan tanda kutip untuk mencari frasa persis, misalnya "sabar dan shalat".'
        />
      ) : loadingIdx ? (
        <Card class="p-8 text-center text-sm text-[var(--muted-foreground)]">
          Memuat indeks pencarian…
        </Card>
      ) : indexError ? (
        <EmptyState
          icon={<SearchX class="size-5" />}
          title="Indeks pencarian belum tersedia offline"
          description="Kamu tetap bisa langsung melompat ke ayat (mis. ketik 2:255 atau yasin 1). Sambungkan internet sekali untuk melengkapi indeks pencarian bahasa ini."
          action={
            <Button size="sm" variant="outline" onClick={() => setRetryTick((t) => t + 1)}>
              Coba lagi
            </Button>
          }
        />
      ) : result.hits.length === 0 ? (
        <EmptyState
          icon={<SearchX class="size-5" />}
          title={`Tidak ada ayat yang cocok dengan "${query.trim()}"`}
          description="Coba kata kunci lain, periksa ejaan, atau ganti bahasa pencarian."
        />
      ) : (
        <div class="space-y-3">
          {result.hits.map(({ row }) => {
            const [globalId, surahId, ayahNum, text] = row;
            const sName = surahMap.get(surahId)?.name ?? `Surah ${surahId}`;
            const chunks = highlightMatches(text, highlightTerms, lang);
            return (
              <a
                key={globalId}
                href={`/app/baca/${surahId}?ayat=${ayahNum}`}
                class="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)] no-underline"
              >
                <div class="mb-2 flex items-center justify-between">
                  <Badge variant="primary">
                    QS. {sName} · {surahId}:{ayahNum}
                  </Badge>
                  <span class="text-xs font-medium text-[var(--primary)]">Buka ayat →</span>
                </div>
                <p
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  lang={lang === 'ar' ? 'ar' : undefined}
                  class={
                    lang === 'ar'
                      ? 'quran-text text-right text-2xl text-[var(--foreground)]'
                      : 'text-sm leading-relaxed text-[var(--foreground)]'
                  }
                >
                  {chunks.map((c, idx) =>
                    c.mark ? (
                      <mark
                        key={idx}
                        class="rounded bg-[var(--accent)] px-0.5 font-semibold text-[var(--accent-foreground)]"
                      >
                        {c.text}
                      </mark>
                    ) : (
                      <span key={idx}>{c.text}</span>
                    )
                  )}
                </p>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
