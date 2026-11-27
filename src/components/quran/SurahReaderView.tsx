import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutList,
  Pause,
  Play,
  SlidersHorizontal,
  Star,
} from 'lucide-preact';
import {
  fetchQuranMeta,
  fetchSurahAyahs,
  fetchSurahTajwid,
  type Ayah,
  type SurahMeta,
} from '@/lib/quran/api';
import type { TajwidSegment } from '@/lib/quran/tajwid-parser';
import {
  audioPrefs,
  currentAyah,
  isPlaying,
  playAyah,
  scrollAyahIntoView,
  togglePlay,
} from '@/stores/audio-player';
import { isSurahSaved, toggleSavedSurah } from '@/stores/library';
import { recordReadAyahs } from '@/stores/progress';
import { readerSettings, updateReaderSettings } from '@/stores/reader-settings';
import { Badge, Button, Card } from '@/components/ui/Primitives';
import { AyahCard } from './AyahCard';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';

function parseSurahIdFromUrl(fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const m = window.location.pathname.match(/^\/app\/baca\/(\d+)\/?$/);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 114 ? n : fallback;
}

export function SurahReaderView({ surahId: initialSurahId }: { surahId: number }) {
  const [surahId, setSurahId] = useState<number>(() => parseSurahIdFromUrl(initialSurahId));
  const [surah, setSurah] = useState<SurahMeta | null>(null);
  const [prevSurah, setPrevSurah] = useState<SurahMeta | null>(null);
  const [nextSurah, setNextSurah] = useState<SurahMeta | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [tajwidMap, setTajwidMap] = useState<Map<number, TajwidSegment[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetAyah, setTargetAyah] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(40);
  const lastScrolledAyahId = useRef<number | null>(null);

  useEffect(() => {
    const syncId = () => setSurahId(parseSurahIdFromUrl(initialSurahId));
    syncId();
    document.addEventListener('astro:after-swap', syncId);
    document.addEventListener('astro:page-load', syncId);
    return () => {
      document.removeEventListener('astro:after-swap', syncId);
      document.removeEventListener('astro:page-load', syncId);
    };
  }, [initialSurahId]);

  const settings = readerSettings.value;
  const saved = isSurahSaved(surahId);
  const activeAyah = currentAyah.value;
  const playing = isPlaying.value;
  const autoScroll = audioPrefs.value.autoScroll;
  const activeInThisSurah = activeAyah && activeAyah.surahId === surahId ? activeAyah : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qAyat = Number(params.get('ayat') || 0);
    if (qAyat > 0) {
      setTargetAyah(qAyat);
      setVisibleCount((v) => Math.max(v, qAyat + 15));
    }

    let alive = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([fetchQuranMeta(), fetchSurahAyahs(surahId)])
      .then(([meta, list]) => {
        if (!alive) return;
        const idx = meta.surahs.findIndex((s) => s.id === surahId);
        const found = meta.surahs[idx] ?? null;
        setSurah(found);
        if (found) document.title = `${found.name} · Al-Qur'an Digital — Teras Qur'an`;
        setPrevSurah(idx > 0 ? meta.surahs[idx - 1] : null);
        setNextSurah(idx >= 0 && idx < meta.surahs.length - 1 ? meta.surahs[idx + 1] : null);
        setAyahs(list);
        setLoading(false);

        // Record first opened ayahs gently after 2s reading
        if (list.length) {
          const initialIds = list.slice(0, Math.min(7, list.length)).map((a) => a.i);
          setTimeout(() => {
            if (alive) recordReadAyahs(initialIds);
          }, 2000);
        }

        if (qAyat > 0) {
          setTimeout(() => {
            document.getElementById(`ayat-${qAyat}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 120);
        }
      })
      .catch(() => {
        if (alive) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [surahId, reloadTick]);

  useEffect(() => {
    if (!settings.tajwid) return;
    fetchSurahTajwid(surahId)
      .then((map) => setTajwidMap(map))
      .catch(() => {});
  }, [surahId, settings.tajwid]);

  // Reset tracked scroll ayah when changing surah or stopping playback
  useEffect(() => {
    if (!activeInThisSurah) {
      lastScrolledAyahId.current = null;
    }
  }, [surahId, activeInThisSurah?.i]);

  // Auto-expand rendered ayahs and smoothly scroll to the ayah currently recited by the qari
  useEffect(() => {
    if (!autoScroll || loading || !activeInThisSurah) return;

    if (activeInThisSurah.n > visibleCount) {
      setVisibleCount((v) => Math.max(v, activeInThisSurah.n + 15));
      return;
    }

    if (lastScrolledAyahId.current === activeInThisSurah.i) return;

    const rafId = window.requestAnimationFrame(() => {
      const el = document.getElementById(`ayat-${activeInThisSurah.n}`);
      if (el) {
        lastScrolledAyahId.current = activeInThisSurah.i;
        scrollAyahIntoView(el);
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [autoScroll, loading, activeInThisSurah?.i, activeInThisSurah?.n, visibleCount]);

  const firstPage = ayahs[0]?.page ?? 1;
  const displayed = ayahs.slice(0, visibleCount);

  if (loading) {
    return (
      <div class="space-y-4">
        <div class="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
        <div class="h-44 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
        <div class="h-44 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card class="p-8 text-center">
        <p class="font-semibold">Surah belum tersimpan di perangkat</p>
        <p class="mx-auto mt-1 max-w-sm text-xs text-[var(--muted-foreground)]">
          Perangkat sedang offline dan data surah ini belum selesai disimpan otomatis. Sambungkan ke internet sejenak lalu coba lagi.
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            Coba lagi
          </Button>
          <Button href="/app/surah" size="sm" variant="outline">
            Lihat daftar surah
          </Button>
        </div>
      </Card>
    );
  }

  if (!surah) {
    return (
      <Card class="p-8 text-center">
        <p class="font-semibold">Surah tidak ditemukan</p>
        <Button href="/app/surah" class="mt-4" size="sm">
          Lihat daftar surah
        </Button>
      </Card>
    );
  }

  return (
    <div class="space-y-5">
      {/* Surah Header Card */}
      <Card class="p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="primary">Surah ke-{surah.id}</Badge>
              <Badge>{surah.revelation}</Badge>
              <Badge>{surah.ayahCount} ayat</Badge>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {surah.name}
            </h1>
            <p class="mt-0.5 text-sm text-[var(--muted-foreground)]">{surah.meaning}</p>
          </div>
          <p class="quran-text text-3xl text-[var(--primary)] sm:text-right" dir="rtl" lang="ar">
            {surah.arabicName}
          </p>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <Button
            size="sm"
            onClick={() => {
              if (!ayahs.length) return;
              if (activeInThisSurah) {
                if (!playing && autoScroll) {
                  lastScrolledAyahId.current = activeInThisSurah.i;
                  scrollAyahIntoView(document.getElementById(`ayat-${activeInThisSurah.n}`));
                }
                togglePlay();
              } else {
                playAyah(ayahs[0], ayahs, surah.name);
              }
            }}
          >
            {activeInThisSurah && playing ? (
              <>
                <Pause class="size-3.5" />
                Jeda audio
              </>
            ) : (
              <>
                <Play class="size-3.5" />
                {activeInThisSurah ? 'Lanjutkan audio' : 'Putar surah'}
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant={saved ? 'secondary' : 'outline'}
            onClick={() => toggleSavedSurah(surah.id)}
          >
            <Star class={`size-3.5 ${saved ? 'fill-current text-[var(--gold)]' : ''}`} />
            {saved ? 'Surah pilihan' : 'Simpan surah'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            href={`/app/halaman/${firstPage}`}
            onClick={() => updateReaderSettings({ viewMode: 'page' })}
          >
            <FileText class="size-3.5" />
            Tampilan halaman
          </Button>

          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <SlidersHorizontal class="size-3.5" />
            Tampilan
          </Button>
        </div>
      </Card>

      {/* Basmalah (except Al-Fatihah & At-Taubah) */}
      {surahId !== 1 && surahId !== 9 && (
        <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-5 text-center">
          <p class="quran-text text-2xl text-[var(--foreground)] sm:text-3xl" dir="rtl" lang="ar">
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
          </p>
        </div>
      )}

      {/* Ayah List */}
      <div class="space-y-3.5">
        {displayed.map((ayah) => (
          <AyahCard
            key={ayah.i}
            ayah={ayah}
            surahName={surah.name}
            queue={ayahs}
            tajwidSegments={settings.tajwid ? tajwidMap.get(ayah.n) : undefined}
            highlighted={targetAyah === ayah.n}
          />
        ))}
      </div>

      {visibleCount < ayahs.length && (
        <div class="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => {
              const nextSlice = ayahs.slice(visibleCount, visibleCount + 40);
              recordReadAyahs(nextSlice.map((a) => a.i));
              setVisibleCount((v) => v + 40);
            }}
          >
            <LayoutList class="size-4" />
            Muat ayat berikutnya ({ayahs.length - visibleCount} tersisa)
          </Button>
        </div>
      )}

      {/* Surah Footer Navigation */}
      <div class="grid grid-cols-2 gap-3 pt-4">
        {prevSurah ? (
          <a
            href={`/app/baca/${prevSurah.id}`}
            class="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 text-sm hover:border-[var(--primary)] no-underline"
          >
            <ChevronLeft class="size-4 shrink-0 text-[var(--muted-foreground)]" />
            <div class="min-w-0">
              <p class="text-[11px] text-[var(--muted-foreground)]">Surah sebelumnya</p>
              <p class="truncate font-semibold text-[var(--foreground)]">{prevSurah.name}</p>
            </div>
          </a>
        ) : (
          <div />
        )}

        {nextSurah && (
          <a
            href={`/app/baca/${nextSurah.id}`}
            class="flex items-center justify-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 text-right text-sm hover:border-[var(--primary)] no-underline"
          >
            <div class="min-w-0">
              <p class="text-[11px] text-[var(--muted-foreground)]">Surah berikutnya</p>
              <p class="truncate font-semibold text-[var(--foreground)]">{nextSurah.name}</p>
            </div>
            <ChevronRight class="size-4 shrink-0 text-[var(--muted-foreground)]" />
          </a>
        )}
      </div>

      <ReaderSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
