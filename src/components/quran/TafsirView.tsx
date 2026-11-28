import { useEffect, useState } from 'preact/hooks';
import { ArrowLeft, ChevronLeft, ChevronRight, Play } from 'lucide-preact';
import {
  fetchQuranMeta,
  fetchSurahAyahs,
  fetchSurahTafsir,
  type Ayah,
  type SurahMeta,
  type TafsirItem,
} from '@/lib/quran/api';
import { getTranslationText } from '@/stores/reader-settings';
import { playAyah } from '@/stores/audio-player';
import { Badge, Button, Card } from '@/components/ui/Primitives';

export function TafsirView() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [surahId, setSurahId] = useState(1);
  const [ayahNum, setAyahNum] = useState(1);
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [tafsir, setTafsir] = useState<TafsirItem | null>(null);
  const [tab, setTab] = useState<'short' | 'long'>('short');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = Math.max(1, Math.min(114, Number(p.get('surah') || 1)));
    const a = Math.max(1, Number(p.get('ayat') || 1));
    setSurahId(s);
    setAyahNum(a);
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchSurahAyahs(surahId).catch(() => [] as Ayah[]),
      fetchSurahTafsir(surahId).catch(() => [] as TafsirItem[]),
    ])
      .then(([ayahList, tafsirList]) => {
        if (!alive) return;
        const clamped = Math.min(ayahNum, ayahList.length || 1);
        setAyah(ayahList.find((x) => x.n === clamped) ?? ayahList[0] ?? null);
        setTafsir(tafsirList.find((x) => x.n === clamped) ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [surahId, ayahNum]);

  function navigateTo(s: number, a: number) {
    setSurahId(s);
    setAyahNum(a);
    const url = `/app/tafsir?surah=${s}&ayat=${a}`;
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const surahMeta = surahs.find((s) => s.id === surahId);
  const maxAyat = surahMeta?.ayahCount ?? 7;

  return (
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a
            href={`/app/baca/${surahId}?ayat=${ayahNum}`}
            class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline no-underline"
          >
            <ArrowLeft class="size-3.5" />
            Kembali ke bacaan {surahMeta?.name ?? `Surah ${surahId}`}
          </a>
          <h1 class="text-2xl font-bold tracking-tight">
            Tafsir {surahMeta?.name ?? `Surah ${surahId}`} · Ayat {ayahNum}
          </h1>
          <p class="text-xs text-[var(--muted-foreground)]">
            Ayat {ayahNum} dari {maxAyat} · Sumber: Qur&apos;an Kemenag RI
          </p>
        </div>

        <div class="flex items-center gap-2">
          <select
            id="tafsir-surah-select"
            name="surah"
            aria-label="Pilih surah"
            value={surahId}
            onChange={(e) => navigateTo(Number((e.target as HTMLSelectElement).value), 1)}
            class="h-9 rounded-lg border border-[var(--input)] bg-[var(--card)] px-2.5 text-sm text-[var(--foreground)]"
          >
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name}
              </option>
            ))}
          </select>

          <select
            id="tafsir-ayat-select"
            name="ayat"
            aria-label="Pilih ayat"
            value={ayahNum}
            onChange={(e) => navigateTo(surahId, Number((e.target as HTMLSelectElement).value))}
            class="h-9 rounded-lg border border-[var(--input)] bg-[var(--card)] px-2.5 text-sm text-[var(--foreground)] tabular-nums"
          >
            {Array.from({ length: maxAyat }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Ayat {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div class="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
      ) : (
        <>
          {ayah && (
            <Card class="p-5 sm:p-6">
              <div class="mb-3 flex items-center justify-between">
                <Badge variant="primary">
                  QS. {surahMeta?.name} {surahId}:{ayah.n}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => playAyah(ayah, [ayah], surahMeta?.name ?? '')}
                >
                  <Play class="size-3.5" />
                  Putar ayat
                </Button>
              </div>
              <p class="quran-text text-right text-3xl text-[var(--foreground)]" dir="rtl" lang="ar">
                {ayah.ar}
              </p>
              <p class="mt-3 text-sm italic text-[var(--muted-foreground)]">{ayah.tr}</p>
              <p class="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                {getTranslationText(ayah)}
              </p>
            </Card>
          )}

          {/* Tafsir Tabs */}
          <Card class="p-5 sm:p-6">
            <div class="mb-4 inline-flex rounded-xl bg-[var(--muted)] p-1">
              <button
                type="button"
                onClick={() => setTab('short')}
                class={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'short'
                    ? 'bg-[var(--card)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Ringkas (Wajiz)
              </button>
              <button
                type="button"
                onClick={() => setTab('long')}
                class={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'long'
                    ? 'bg-[var(--card)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Lengkap (Tahlili)
              </button>
            </div>

            {tafsir ? (
              <div class="space-y-3 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-line">
                {tab === 'short' ? tafsir.short : tafsir.long}
              </div>
            ) : (
              <p class="text-sm text-[var(--muted-foreground)]">
                Tafsir surah ini belum tersedia di perangkat. Sambungkan ke internet sebentar agar tafsir otomatis tersimpan offline.
              </p>
            )}
          </Card>

          <div class="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              disabled={ayahNum <= 1}
              onClick={() => navigateTo(surahId, ayahNum - 1)}
            >
              <ChevronLeft class="size-4" />
              Ayat sebelumnya
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={ayahNum >= maxAyat}
              onClick={() => navigateTo(surahId, ayahNum + 1)}
            >
              Ayat berikutnya
              <ChevronRight class="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
