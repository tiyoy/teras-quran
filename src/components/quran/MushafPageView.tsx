import { useEffect, useRef, useState } from 'preact/hooks';
import {
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  LayoutList,
  Play,
  SlidersHorizontal,
} from 'lucide-preact';
import {
  fetchMushafPageAyahs,
  fetchQuranMeta,
  type Ayah,
  type SurahMeta,
} from '@/lib/quran/api';
import {
  audioPrefs,
  currentAyah,
  playAyah,
  scrollAyahIntoView,
} from '@/stores/audio-player';
import { isFavoriteAyah, setLastRead, toggleFavoriteAyah } from '@/stores/library';
import { recordReadAyahs } from '@/stores/progress';
import { getTranslationText, readerSettings, updateReaderSettings } from '@/stores/reader-settings';
import { Button, Card, Modal } from '@/components/ui/Primitives';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumeral(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('');
}

function parsePageFromUrl(fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const m = window.location.pathname.match(/^\/app\/halaman\/(\d+)\/?$/);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 604 ? n : fallback;
}

export function MushafPageView({ pageNumber: initialPage }: { pageNumber: number }) {
  const [pageNumber, setPageNumber] = useState<number>(() => parsePageFromUrl(initialPage));
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahMap, setSurahMap] = useState<Map<number, SurahMeta>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState(String(pageNumber));
  const lastScrolledAyahId = useRef<number | null>(null);

  useEffect(() => {
    const syncPage = () => setPageNumber(parsePageFromUrl(initialPage));
    syncPage();
    document.addEventListener('astro:after-swap', syncPage);
    document.addEventListener('astro:page-load', syncPage);
    return () => {
      document.removeEventListener('astro:after-swap', syncPage);
      document.removeEventListener('astro:page-load', syncPage);
    };
  }, [initialPage]);

  const settings = readerSettings.value;
  const cappedSize = Math.min(settings.arabicSize, 36);
  const activeAyah = currentAyah.value;
  const autoScroll = audioPrefs.value.autoScroll;

  useEffect(() => {
    setJumpInput(String(pageNumber));
    document.title = `Halaman ${pageNumber} · Al-Qur'an Digital — Teras Qur'an`;
    let alive = true;
    setLoading(true);
    Promise.all([fetchQuranMeta(), fetchMushafPageAyahs(pageNumber)])
      .then(([meta, list]) => {
        if (!alive) return;
        setSurahMap(new Map(meta.surahs.map((s) => [s.id, s])));
        setAyahs(list);
        setLoading(false);
        if (list.length) {
          setTimeout(() => {
            if (alive) recordReadAyahs(list.map((a) => a.i));
          }, 2000);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [pageNumber]);

  useEffect(() => {
    if (!activeAyah) {
      lastScrolledAyahId.current = null;
      return;
    }
    if (!autoScroll || loading || activeAyah.page !== pageNumber) return;
    if (lastScrolledAyahId.current === activeAyah.i) return;

    const rafId = window.requestAnimationFrame(() => {
      const el = document.getElementById(`page-ayat-${activeAyah.i}`);
      if (el) {
        lastScrolledAyahId.current = activeAyah.i;
        scrollAyahIntoView(el);
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [autoScroll, loading, activeAyah?.i, activeAyah?.page, pageNumber]);

  // Group contiguous ayahs by surahId
  const groups: Array<{ surahId: number; startsHere: boolean; ayahs: Ayah[] }> = [];
  for (const a of ayahs) {
    const prev = groups[groups.length - 1];
    if (prev && prev.surahId === a.surahId) {
      prev.ayahs.push(a);
    } else {
      groups.push({ surahId: a.surahId, startsHere: a.n === 1, ayahs: [a] });
    }
  }

  const juzs = [...new Set(ayahs.map((a) => a.juz))].sort((a, b) => a - b);
  const firstSurahId = ayahs[0]?.surahId ?? 1;

  return (
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Halaman {pageNumber}</h1>
          <p class="text-xs text-[var(--muted-foreground)]">
            {juzs.length === 1 ? `Juz ${juzs[0]}` : juzs.length > 1 ? `Juz ${juzs[0]}–${juzs[juzs.length - 1]}` : 'Mushaf standar Madinah'}
            {' · '}Ketuk ayat untuk melihat terjemahan &amp; opsi.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            href={`/app/baca/${firstSurahId}`}
            onClick={() => updateReaderSettings({ viewMode: 'card' })}
          >
            <LayoutList class="size-3.5" />
            Tampilan kartu
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <SlidersHorizontal class="size-3.5" />
            Tampilan
          </Button>
        </div>
      </div>

      {loading ? (
        <div class="h-96 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
      ) : (
        <Card class="p-5 sm:p-8">
          <div class="space-y-6">
            {groups.map((grp, idx) => {
              const sMeta = surahMap.get(grp.surahId);
              return (
                <div key={`${grp.surahId}-${idx}`}>
                  {grp.startsHere && sMeta && (
                    <div class="mb-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 text-center">
                      <p class="quran-text text-xl text-[var(--primary)]" dir="rtl" lang="ar">
                        {sMeta.arabicFull}
                      </p>
                      <p class="mt-0.5 text-xs font-medium text-[var(--secondary-foreground)]">
                        {sMeta.name} · {sMeta.meaning} ({sMeta.ayahCount} ayat)
                      </p>
                    </div>
                  )}

                  {grp.startsHere && grp.surahId !== 1 && grp.surahId !== 9 && (
                    <p
                      class="quran-text mb-4 text-center text-2xl text-[var(--foreground)]"
                      dir="rtl"
                      lang="ar"
                    >
                      بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                    </p>
                  )}

                  <p
                    dir="rtl"
                    lang="ar"
                    style={{ fontSize: `${cappedSize}px` }}
                    class="quran-text text-justify text-[var(--foreground)]"
                  >
                    {grp.ayahs.map((a) => {
                      const isCurrent = activeAyah?.i === a.i;
                      return (
                        <span
                          key={a.i}
                          id={`page-ayat-${a.i}`}
                          onClick={() => setSelectedAyah(a)}
                          class={`scroll-mt-24 cursor-pointer rounded px-1 transition-colors ${
                            isCurrent
                              ? 'bg-[var(--accent)] ring-1 ring-[var(--primary)]/50'
                              : 'hover:bg-[var(--accent)]'
                          }`}
                        >
                          {a.ar}{' '}
                          <span class="mx-0.5 inline-block font-sans text-[0.55em] font-semibold text-[var(--primary)]">
                            ﴿{toArabicNumeral(a.n)}﴾
                          </span>{' '}
                        </span>
                      );
                    })}
                  </p>
                </div>
              );
            })}
          </div>

          <div class="mt-6 border-t border-[var(--border)] pt-3 text-center text-xs text-[var(--muted-foreground)] tabular-nums">
            Halaman {pageNumber} dari 604 · Tampilan teks per halaman
          </div>
        </Card>
      )}

      {/* Page Pager */}
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={pageNumber <= 1}
          href={pageNumber > 1 ? `/app/halaman/${pageNumber - 1}` : undefined}
        >
          <ChevronLeft class="size-4" />
          Sebelumnya
        </Button>

        <form
          class="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(jumpInput);
            if (n >= 1 && n <= 604) window.location.href = `/app/halaman/${n}`;
          }}
        >
          <input
            type="number"
            min={1}
            max={604}
            value={jumpInput}
            onInput={(e) => setJumpInput((e.target as HTMLInputElement).value)}
            aria-label="Nomor halaman"
            class="h-8 w-20 rounded-lg border border-[var(--input)] bg-[var(--card)] px-2 text-center text-sm tabular-nums"
          />
          <Button size="sm" type="submit" variant="secondary">
            Buka
          </Button>
        </form>

        <Button
          size="sm"
          variant="outline"
          disabled={pageNumber >= 604}
          href={pageNumber < 604 ? `/app/halaman/${pageNumber + 1}` : undefined}
        >
          Berikutnya
          <ChevronRight class="size-4" />
        </Button>
      </div>

      {/* Selected Ayah Detail Modal */}
      {selectedAyah && (
        <Modal
          open={Boolean(selectedAyah)}
          onClose={() => setSelectedAyah(null)}
          title={`${surahMap.get(selectedAyah.surahId)?.name ?? `Surah ${selectedAyah.surahId}`} · Ayat ${selectedAyah.n}`}
          description={`Juz ${selectedAyah.juz} · Halaman ${selectedAyah.page}`}
        >
          <div class="space-y-4">
            <p class="quran-text text-right text-2xl text-[var(--foreground)]" dir="rtl" lang="ar">
              {selectedAyah.ar}
            </p>
            <div class="space-y-1.5">
              <p
                style={{ fontSize: `${settings.latinSize}px` }}
                class="italic leading-relaxed text-[var(--muted-foreground)]"
              >
                {selectedAyah.tr}
              </p>
              <p
                style={{ fontSize: `${settings.translationSize}px` }}
                class="leading-relaxed text-[var(--foreground)]"
              >
                {getTranslationText(selectedAyah)}
              </p>
            </div>
            <div class="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
              <Button
                size="sm"
                onClick={() => {
                  playAyah(
                    selectedAyah,
                    ayahs,
                    surahMap.get(selectedAyah.surahId)?.name ?? ''
                  );
                  setSelectedAyah(null);
                }}
              >
                <Play class="size-3.5" />
                Putar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toggleFavoriteAyah(selectedAyah.i, selectedAyah.surahId, selectedAyah.n)
                }
              >
                <Heart
                  class={`size-3.5 ${
                    isFavoriteAyah(selectedAyah.i) ? 'fill-current text-[var(--destructive)]' : ''
                  }`}
                />
                Favorit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setLastRead({
                    surahId: selectedAyah.surahId,
                    ayahNumber: selectedAyah.n,
                    globalAyahId: selectedAyah.i,
                    page: selectedAyah.page,
                    juz: selectedAyah.juz,
                  })
                }
              >
                <Bookmark class="size-3.5" />
                Bacaan terakhir
              </Button>
              <Button
                size="sm"
                variant="outline"
                href={`/app/tafsir?surah=${selectedAyah.surahId}&ayat=${selectedAyah.n}`}
              >
                <BookOpen class="size-3.5" />
                Tafsir
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ReaderSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
