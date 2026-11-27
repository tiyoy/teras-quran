import { useEffect, useState } from 'preact/hooks';
import { ArrowLeft, Eye, Play, RefreshCw } from 'lucide-preact';
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
import { Badge, Button, Card, PageHeader } from '@/components/ui/Primitives';

interface LoadedQ {
  q: SambungQuestion;
  promptAyah: Ayah;
  answerAyah: Ayah;
  surahName: string;
}

export function SambungAyatView() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [source, setSource] = useState<'surah' | 'hafalan'>('surah');
  const [surahId, setSurahId] = useState(78);
  const [count, setCount] = useState(5);

  const [questions, setQuestions] = useState<LoadedQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grades, setGrades] = useState<Array<{ item: LoadedQ; grade: 'good' | 'unsure' | 'forgot' }>>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'setup' | 'quiz' | 'done'>('setup');

  useEffect(() => {
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, []);

  async function startQuiz() {
    setBusy(true);
    try {
      const pool: Array<{ surahId: number; ayahNumber: number; globalId: number }> = [];
      if (source === 'surah') {
        const list = await fetchSurahAyahs(surahId);
        list.forEach((a) => pool.push({ surahId: a.surahId, ayahNumber: a.n, globalId: a.i }));
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
    <div>
      <a
        href="/app/hafalan"
        class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline no-underline"
      >
        <ArrowLeft class="size-3.5" />
        Kembali ke Hafalan
      </a>
      <PageHeader
        title="Latihan sambung ayat"
        description="Lihat atau dengarkan satu ayat, lalu lanjutkan ayat sesudahnya dari hafalanmu."
      />

      {stage === 'setup' && (
        <Card class="space-y-5 p-6">
          <div>
            <p class="mb-2 text-xs font-semibold text-[var(--muted-foreground)]">Sumber soal</p>
            <div class="grid grid-cols-2 rounded-xl bg-[var(--muted)] p-1">
              <button
                type="button"
                onClick={() => setSource('surah')}
                class={`rounded-lg py-2 text-xs font-semibold cursor-pointer ${
                  source === 'surah' ? 'bg-[var(--card)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
                }`}
              >
                Pilih surah
              </button>
              <button
                type="button"
                onClick={() => setSource('hafalan')}
                class={`rounded-lg py-2 text-xs font-semibold cursor-pointer ${
                  source === 'hafalan' ? 'bg-[var(--card)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
                }`}
              >
                Hafalanku ({hifzItems.value.length})
              </button>
            </div>
          </div>

          {source === 'surah' && (
            <div>
              <label class="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
                Surah
              </label>
              <select
                value={surahId}
                onChange={(e) => setSurahId(Number((e.target as HTMLSelectElement).value))}
                class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
              >
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.name} ({s.ayahCount} ayat)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p class="mb-1.5 text-xs font-medium text-[var(--muted-foreground)]">Jumlah soal</p>
            <div class="flex flex-wrap gap-2">
              {[5, 10, 15, 20].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={count === n ? 'primary' : 'outline'}
                  onClick={() => setCount(n)}
                >
                  {n} soal
                </Button>
              ))}
            </div>
          </div>

          <Button
            disabled={busy || (source === 'hafalan' && hifzItems.value.length === 0)}
            onClick={startQuiz}
          >
            {busy ? 'Menyiapkan soal…' : 'Mulai latihan'}
          </Button>
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
