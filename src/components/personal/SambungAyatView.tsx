import { useEffect, useState } from 'preact/hooks';
import { ArrowRight, Eye, Play, RefreshCw } from 'lucide-preact';
import {
  fetchAyahsByGlobalIds,
  fetchQuranMeta,
  fetchSurahAyahs,
  type Ayah,
  type SurahMeta,
} from '@/lib/quran/api';
import { generateSambungQuestions, type SambungQuestion } from '@/lib/hifz/sambung-logic';
import { toGlobalAyah } from '@/lib/quran/meta';
import { hifzItems } from '@/stores/hifz';
import { playAyah } from '@/stores/audio-player';
import { useAuthGate } from '@/components/auth/LoginRequired';
import { Badge, Button, Card, PageHeader } from '@/components/ui/Primitives';

interface LoadedQ {
  q: SambungQuestion;
  promptAyah: Ayah;
  answerAyah: Ayah;
  surahName: string;
}

const QUESTION_COUNTS = [5, 10, 20] as const;

export function SambungAyatView() {
  const gate = useAuthGate();
  const loggedIn = gate === 'authenticated';

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [source, setSource] = useState<'surah' | 'hafalan'>('surah');
  const [surahId, setSurahId] = useState<number>(0);
  const [fromAyah, setFromAyah] = useState<string>('');
  const [toAyah, setToAyah] = useState<string>('');
  const [count, setCount] = useState<number>(10);

  const [questions, setQuestions] = useState<LoadedQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grades, setGrades] = useState<Array<{ item: LoadedQ; grade: 'good' | 'unsure' | 'forgot' }>>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'setup' | 'quiz' | 'done'>('setup');

  useEffect(() => {
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, []);

  const selectedSurah = surahs.find((s) => s.id === surahId) ?? null;
  const hifzCount = loggedIn ? hifzItems.value.length : 0;
  const canUseHafalan = loggedIn && hifzCount > 0;

  const parsedFrom = fromAyah === '' ? 1 : Number(fromAyah);
  const parsedTo = toAyah === '' ? (selectedSurah?.ayahCount ?? 1) : Number(toAyah);
  const validRange =
    !selectedSurah ||
    (Number.isInteger(parsedFrom) &&
      Number.isInteger(parsedTo) &&
      parsedFrom >= 1 &&
      parsedTo <= selectedSurah.ayahCount &&
      parsedTo - parsedFrom >= 1);

  const canStart =
    source === 'surah' ? surahId > 0 && validRange : canUseHafalan;

  async function startQuiz() {
    if (!canStart) return;
    setBusy(true);
    try {
      const pool: Array<{ surahId: number; ayahNumber: number; globalId: number }> = [];
      if (source === 'surah') {
        const list = await fetchSurahAyahs(surahId);
        list
          .filter((a) => a.n >= parsedFrom && a.n <= parsedTo)
          .forEach((a) => pool.push({ surahId: a.surahId, ayahNumber: a.n, globalId: a.i }));
      } else {
        for (const it of hifzItems.value) {
          for (let n = it.fromAyah; n <= it.toAyah; n++) {
            const g = toGlobalAyah(it.surahId, n);
            if (g) pool.push({ surahId: it.surahId, ayahNumber: n, globalId: g });
          }
        }
      }

      const qs = generateSambungQuestions(pool, count);
      if (!qs.length) return;
      const neededIds = qs.flatMap((q) => [q.prompt.globalId, q.answer.globalId]);
      const loadedAyahs = await fetchAyahsByGlobalIds(neededIds);
      const ayahMap = new Map(loadedAyahs.map((a) => [a.i, a]));
      const surahMap = new Map(surahs.map((s) => [s.id, s.name]));

      const ready: LoadedQ[] = qs.flatMap((q) => {
        const pAyah = ayahMap.get(q.prompt.globalId);
        const aAyah = ayahMap.get(q.answer.globalId);
        if (!pAyah || !aAyah) return [];
        return [{ q, promptAyah: pAyah, answerAyah: aAyah, surahName: surahMap.get(q.prompt.surahId) ?? '' }];
      });

      setQuestions(ready);
      setIdx(0);
      setGrades([]);
      setRevealed(false);
      setStage('quiz');
    } finally {
      setBusy(false);
    }
  }

  function gradeCurrent(grade: 'good' | 'unsure' | 'forgot') {
    const cur = questions[idx];
    if (!cur) return;
    setGrades((g) => [...g, { item: cur, grade }]);
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
      setRevealed(false);
    } else {
      setStage('done');
    }
  }

  const current = questions[idx];
  const toRevise = grades.filter((g) => g.grade !== 'good');

  return (
    <div class="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Latihan sambung ayat"
        description="Lihat atau dengarkan satu ayat, lalu lanjutkan ayat sesudahnya dari hafalanmu."
      />

      {stage === 'setup' && (
        <Card class="space-y-5 p-5 sm:p-6">
          {/* Sumber soal */}
          <div>
            <p class="mb-2 text-sm font-semibold text-[var(--foreground)]">Sumber soal</p>
            <div class="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--border)] divide-x divide-[var(--border)]">
              <button
                type="button"
                onClick={() => setSource('surah')}
                class={`py-2 text-xs transition-colors cursor-pointer ${
                  source === 'surah'
                    ? 'bg-[var(--accent)] font-semibold text-[var(--foreground)]'
                    : 'bg-[var(--card)] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                Pilih surah
              </button>
              <button
                type="button"
                disabled={!canUseHafalan}
                onClick={() => {
                  if (canUseHafalan) setSource('hafalan');
                }}
                class={`py-2 text-xs transition-colors ${
                  !canUseHafalan
                    ? 'bg-[var(--card)] font-medium text-[var(--muted-foreground)]/60 cursor-not-allowed'
                    : source === 'hafalan'
                      ? 'bg-[var(--accent)] font-semibold text-[var(--foreground)] cursor-pointer'
                      : 'bg-[var(--card)] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer'
                }`}
              >
                Hafalanku{canUseHafalan ? ` (${hifzCount})` : ''}
              </button>
            </div>
            {gate === 'guest' && (
              <p class="mt-2 text-xs text-[var(--muted-foreground)]">
                Masuk untuk berlatih dari hafalanmu.
              </p>
            )}
            {loggedIn && hifzCount === 0 && (
              <p class="mt-2 text-xs text-[var(--muted-foreground)]">
                Belum ada hafalan yang ditandai. Tandai hafalan di halaman Hafalan terlebih dahulu.
              </p>
            )}
          </div>

          {/* Surah select */}
          {source === 'surah' && (
            <div class="space-y-3">
              <div>
                <label
                  for="sambung-surah"
                  class="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Surah
                </label>
                <select
                  id="sambung-surah"
                  value={surahId}
                  onChange={(e) => {
                    const next = Number((e.target as HTMLSelectElement).value);
                    setSurahId(next);
                    setFromAyah('');
                    setToAyah('');
                  }}
                  class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                >
                  <option value={0}>Pilih surah</option>
                  {surahs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id}. {s.name} ({s.ayahCount} ayat)
                    </option>
                  ))}
                </select>
              </div>

              {selectedSurah && (
                <div class="grid grid-cols-2 gap-3">
                  <label class="text-xs font-medium text-[var(--muted-foreground)]">
                    Dari ayat (opsional)
                    <input
                      type="number"
                      min={1}
                      max={selectedSurah.ayahCount}
                      placeholder="1"
                      value={fromAyah}
                      onInput={(e) => setFromAyah((e.target as HTMLInputElement).value)}
                      class="mt-1 h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] tabular-nums focus:border-[var(--primary)] focus:outline-none"
                    />
                  </label>
                  <label class="text-xs font-medium text-[var(--muted-foreground)]">
                    Sampai ayat (opsional)
                    <input
                      type="number"
                      min={1}
                      max={selectedSurah.ayahCount}
                      placeholder={String(selectedSurah.ayahCount)}
                      value={toAyah}
                      onInput={(e) => setToAyah((e.target as HTMLInputElement).value)}
                      class="mt-1 h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] tabular-nums focus:border-[var(--primary)] focus:outline-none"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Jumlah soal */}
          <div>
            <p class="mb-2 text-sm font-semibold text-[var(--foreground)]">Jumlah soal</p>
            <div class="grid grid-cols-3 overflow-hidden rounded-lg border border-[var(--border)] divide-x divide-[var(--border)]">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  class={`py-2 text-xs tabular-nums transition-colors cursor-pointer ${
                    count === n
                      ? 'bg-[var(--accent)] font-semibold text-[var(--foreground)]'
                      : 'bg-[var(--card)] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div class="pt-1">
            <Button size="sm" disabled={busy || !canStart} onClick={startQuiz}>
              {busy ? 'Menyiapkan…' : 'Mulai'}
              <ArrowRight class="size-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {stage === 'quiz' && current && (
        <Card class="space-y-5 p-6">
          <div class="flex items-center justify-between">
            <Badge variant="primary" class="tabular-nums">
              Soal {idx + 1} dari {questions.length}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => setStage('setup')}>
              Akhiri
            </Button>
          </div>

          <div class="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs font-medium text-[var(--muted-foreground)]">
                Lanjutkan setelah ayat ini ({current.surahName} : {current.promptAyah.n})
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => playAyah(current.promptAyah, [current.promptAyah], current.surahName)}
              >
                <Play class="size-3.5" />
                Putar
              </Button>
            </div>
            <p class="quran-text text-right text-3xl text-[var(--foreground)]" dir="rtl" lang="ar">
              {current.promptAyah.ar}
            </p>
          </div>

          {!revealed ? (
            <Button class="w-full" onClick={() => setRevealed(true)}>
              <Eye class="size-4" />
              Tampilkan ayat berikutnya
            </Button>
          ) : (
            <div class="space-y-4">
              <div class="rounded-2xl border border-[var(--primary)]/40 bg-[var(--accent)]/40 p-5">
                <p class="mb-2 text-xs font-semibold text-[var(--primary)]">
                  Ayat berikutnya ({current.surahName} : {current.answerAyah.n})
                </p>
                <p class="quran-text text-right text-3xl text-[var(--foreground)]" dir="rtl" lang="ar">
                  {current.answerAyah.ar}
                </p>
              </div>

              <div>
                <p class="mb-2 text-xs font-semibold text-[var(--muted-foreground)]">
                  Bagaimana hafalanmu?
                </p>
                <div class="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="destructive" onClick={() => gradeCurrent('forgot')}>
                    Lupa
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => gradeCurrent('unsure')}>
                    Ragu
                  </Button>
                  <Button size="sm" onClick={() => gradeCurrent('good')}>
                    Lancar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {stage === 'done' && (
        <Card class="space-y-5 p-6">
          <div>
            <h2 class="text-lg font-bold">Latihan selesai</h2>
            <p class="text-sm text-[var(--muted-foreground)]">
              {toRevise.length === 0
                ? 'Semua lancar. Masya Allah!'
                : `${grades.length - toRevise.length} lancar, ${toRevise.length} perlu diulang.`}
            </p>
          </div>

          {toRevise.length > 0 && (
            <div class="space-y-2">
              <p class="text-xs font-semibold text-[var(--muted-foreground)]">Perlu diulang</p>
              {toRevise.map(({ item }) => (
                <div
                  key={item.answerAyah.i}
                  class="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-sm"
                >
                  <span>
                    {item.surahName} : {item.promptAyah.n} → {item.answerAyah.n}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    href={`/app/baca/${item.answerAyah.surahId}?ayat=${item.answerAyah.n}`}
                  >
                    Baca
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div class="flex flex-wrap gap-2">
            {toRevise.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  setQuestions(toRevise.map((r) => r.item));
                  setIdx(0);
                  setGrades([]);
                  setRevealed(false);
                  setStage('quiz');
                }}
              >
                <RefreshCw class="size-3.5" />
                Ulangi yang belum lancar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setStage('setup')}>
              Latihan baru
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
