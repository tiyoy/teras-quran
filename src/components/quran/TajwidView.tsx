import { useEffect, useState } from 'preact/hooks';
import { BookOpen, CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-preact';
import { TAJWID_RULE_MAP, TAJWID_RULES } from '@/data/tajwid-rules';
import {
  fetchSurahAyahs,
  fetchSurahTajwid,
  type Ayah,
} from '@/lib/quran/api';
import {
  tajwidClassName,
  type TajwidGroup,
  type TajwidSegment,
} from '@/lib/quran/tajwid-parser';
import { playAyah } from '@/stores/audio-player';
import { Badge, Button, Card, PageHeader } from '@/components/ui/Primitives';

interface QuizQuestion {
  surahId: number;
  ayahNumber: number;
  segments: TajwidSegment[];
  targetIdx: number;
  correctGroup: TajwidGroup;
  options: TajwidGroup[];
}

export function TajwidView() {
  const [tab, setTab] = useState<'learn' | 'practice'>('learn');
  const [exampleCache, setExampleCache] = useState<
    Record<string, { ayah: Ayah; segments: TajwidSegment[] }>
  >({});

  // Practice quiz state
  const [quizBusy, setQuizBusy] = useState(false);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<TajwidGroup | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    // Load example ayahs for the 12 rules
    const uniqueSurahs = [...new Set(TAJWID_RULES.flatMap((r) => r.examples.map((e) => e.surahId)))];
    Promise.all(
      uniqueSurahs.map(async (sid) => {
        const [ayahs, tajwid] = await Promise.all([fetchSurahAyahs(sid), fetchSurahTajwid(sid)]);
        return { sid, ayahs, tajwid };
      })
    )
      .then((results) => {
        const next: Record<string, { ayah: Ayah; segments: TajwidSegment[] }> = {};
        for (const r of results) {
          for (const a of r.ayahs) {
            const segs = r.tajwid.get(a.n);
            if (segs) next[`${r.sid}:${a.n}`] = { ayah: a, segments: segs };
          }
        }
        setExampleCache(next);
      })
      .catch(() => {});
  }, []);

  async function nextQuestion() {
    setQuizBusy(true);
    setPicked(null);
    try {
      // Pick random surah from Al-Fatihah or Juz Amma (97..114)
      const poolSurahs = [1, 97, 99, 100, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
      const sid = poolSurahs[Math.floor(Math.random() * poolSurahs.length)];
      const map = await fetchSurahTajwid(sid);
      const candidates: Array<{ ayahNumber: number; segments: TajwidSegment[]; targetIdx: number; group: TajwidGroup }> = [];

      for (const [ayahNum, segs] of map.entries()) {
        segs.forEach(([, grp], idx) => {
          if (grp && grp !== 'silent') {
            candidates.push({ ayahNumber: ayahNum, segments: segs, targetIdx: idx, group: grp });
          }
        });
      }

      if (!candidates.length) return;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const distractors = TAJWID_RULES.map((r) => r.id)
        .filter((g) => g !== chosen.group && g !== 'silent')
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [chosen.group, ...distractors].sort(() => Math.random() - 0.5);

      setQuestion({
        surahId: sid,
        ayahNumber: chosen.ayahNumber,
        segments: chosen.segments,
        targetIdx: chosen.targetIdx,
        correctGroup: chosen.group,
        options,
      });
    } finally {
      setQuizBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Tajwid"
        description="Hukum bacaan Al-Qur'an dengan 12 kode warna, contoh ayat beraudio, dan latihan interaktif."
      />

      <div class="mb-6 inline-flex rounded-xl bg-[var(--muted)] p-1">
        <button
          type="button"
          onClick={() => setTab('learn')}
          class={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'learn'
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          12 Hukum Tajwid
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('practice');
            if (!question) nextQuestion();
          }}
          class={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'practice'
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Latihan Tajwid
        </button>
      </div>

      {tab === 'learn' ? (
        <div class="space-y-4">
          <div class="rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-4 text-xs leading-relaxed text-[var(--secondary-foreground)]">
            <strong>Belajar bersama guru:</strong> Warna tajwid dibuat otomatis sebagai alat bantu visual dan belum ditashih LPMQ. Pastikan kebenaran bacaan tetap ditalaqqi kepada guru.
          </div>

          {TAJWID_RULES.map((rule) => (
            <Card key={rule.id} class="p-5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <span
                    class="size-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--${rule.cssClass})` }}
                  />
                  <h2 class={`text-base font-bold ${rule.cssClass}`}>{rule.name}</h2>
                </div>
                <span class="quran-text rounded-lg bg-[var(--muted)] px-2.5 py-0.5 text-sm text-[var(--foreground)]" dir="rtl" lang="ar">
                  {rule.letters}
                </span>
              </div>

              <p class="mt-2 text-sm text-[var(--foreground)]">{rule.shortDesc}</p>
              <p class="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                <strong>Cara membaca:</strong> {rule.howToRead}
              </p>

              <div class="mt-4 grid gap-2.5 sm:grid-cols-2">
                {rule.examples.map((ex) => {
                  const key = `${ex.surahId}:${ex.ayahNumber}`;
                  const data = exampleCache[key];
                  return (
                    <div
                      key={key}
                      class="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5"
                    >
                      <div class="mb-2 flex items-center justify-between gap-2">
                        <Badge>{ex.label}</Badge>
                        <div class="flex items-center gap-1">
                          {data && (
                            <button
                              type="button"
                              onClick={() => playAyah(data.ayah, [data.ayah], ex.label)}
                              aria-label={`Dengarkan ${ex.label}`}
                              class="inline-flex size-7 items-center justify-center rounded-md text-[var(--primary)] hover:bg-[var(--muted)] cursor-pointer"
                            >
                              <Play class="size-3.5" />
                            </button>
                          )}
                          <a
                            href={`/app/baca/${ex.surahId}?ayat=${ex.ayahNumber}`}
                            aria-label={`Buka ${ex.label}`}
                            class="inline-flex size-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            <BookOpen class="size-3.5" />
                          </a>
                        </div>
                      </div>
                      {data ? (
                        <p class="tajwid-text text-right text-xl text-[var(--foreground)]" dir="rtl" lang="ar">
                          {data.segments.map(([txt, grp], i) => (
                            <span
                              key={i}
                              class={grp === rule.id ? `${tajwidClassName(grp)} font-semibold underline decoration-2 underline-offset-4` : ''}
                            >
                              {txt}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p class="text-xs text-[var(--muted-foreground)]">Memuat contoh…</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card class="p-6">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold">Tebak hukum tajwid</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                Soal diambil acak dari Al-Fatihah dan Juz &lsquo;Amma.
              </p>
            </div>
            <Badge variant="primary" class="tabular-nums">
              {score.correct} dari {score.total} benar
            </Badge>
          </div>

          {quizBusy || !question ? (
            <p class="py-12 text-center text-sm text-[var(--muted-foreground)]">Menyiapkan soal…</p>
          ) : (
            <div class="space-y-5">
              <div class="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                <p class="mb-2 text-xs text-[var(--muted-foreground)]">
                  Hukum apa pada bagian yang ditandai warna &amp; kotak? (QS. {question.surahId}:{question.ayahNumber})
                </p>
                <p class="tajwid-text text-right text-3xl text-[var(--foreground)]" dir="rtl" lang="ar">
                  {question.segments.map(([txt, grp], idx) =>
                    idx === question.targetIdx && grp ? (
                      <span
                        key={idx}
                        class={`${tajwidClassName(grp)} rounded-md border-2 border-current bg-[var(--card)] px-1.5 py-0.5`}
                      >
                        {txt}
                      </span>
                    ) : (
                      <span key={idx}>{txt}</span>
                    )
                  )}
                </p>
              </div>

              <div class="grid gap-2 sm:grid-cols-2">
                {question.options.map((opt) => {
                  const info = TAJWID_RULE_MAP[opt];
                  const isChosen = picked === opt;
                  const isCorrect = opt === question.correctGroup;
                  let cls = 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]';
                  if (picked) {
                    if (isCorrect) cls = 'border-[var(--success)] bg-[var(--success-surface)] text-[var(--success)]';
                    else if (isChosen) cls = 'border-[var(--destructive)] bg-[var(--destructive-surface)] text-[var(--destructive)]';
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(picked)}
                      onClick={() => {
                        setPicked(opt);
                        setScore((s) => ({
                          correct: s.correct + (opt === question.correctGroup ? 1 : 0),
                          total: s.total + 1,
                        }));
                      }}
                      class={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer disabled:cursor-default ${cls}`}
                    >
                      <span>{info.name}</span>
                      {picked && isCorrect && <CheckCircle2 class="size-4 shrink-0" />}
                      {picked && isChosen && !isCorrect && <XCircle class="size-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {picked && (
                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-4 text-xs">
                  <div>
                    <p class="font-semibold text-[var(--foreground)]">
                      {picked === question.correctGroup
                        ? 'Benar!'
                        : `Belum tepat. Jawabannya: ${TAJWID_RULE_MAP[question.correctGroup].name}.`}
                    </p>
                    <p class="mt-0.5 text-[var(--muted-foreground)]">
                      {TAJWID_RULE_MAP[question.correctGroup].shortDesc}
                    </p>
                  </div>
                  <Button size="sm" onClick={nextQuestion}>
                    <RefreshCw class="size-3.5" />
                    Soal berikutnya
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
