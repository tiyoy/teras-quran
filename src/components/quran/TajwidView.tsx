import { useEffect, useRef, useState } from 'preact/hooks';
import { BookOpen, CheckCircle2, Play, RefreshCw, ShieldCheck, XCircle } from 'lucide-preact';
import { TAJWID_RULE_MAP, TAJWID_RULES } from '@/data/tajwid-rules';
import {
  fetchQuranMeta,
  fetchSurahAyahs,
  fetchSurahTajwid,
  type Ayah,
} from '@/lib/quran/api';
import {
  tajwidClassName,
  type TajwidGroup,
  type TajwidSegment,
} from '@/lib/quran/tajwid-parser';
import {
  buildTajwidQuestion,
  evaluateTajwidAnswer,
  getQuestionKey,
  getSegmentQuizClassName,
  shouldInvalidateQuestionOnLearnTab,
  shouldShowQuestionSource,
  TAJWID_QUIZ_SURAH_POOL,
  type TajwidQuizQuestion,
  type TajwidQuizScore,
} from '@/lib/quran/tajwid-quiz';
import { playAyah } from '@/stores/audio-player';
import { showToast } from '@/stores/toast';
import { Badge, Button, Card, PageHeader } from '@/components/ui/Primitives';

export function TajwidView() {
  const [tab, setTab] = useState<'learn' | 'practice'>('learn');
  const [surahNames, setSurahNames] = useState<Record<number, string>>({});
  const [exampleCache, setExampleCache] = useState<
    Record<string, { ayah: Ayah; segments: TajwidSegment[] }>
  >({});

  // Practice quiz state
  const [quizBusy, setQuizBusy] = useState(false);
  const [question, setQuestion] = useState<TajwidQuizQuestion | null>(null);
  const [picked, setPicked] = useState<TajwidGroup | null>(null);
  const [score, setScore] = useState<TajwidQuizScore>({ correct: 0, total: 0 });
  const lastQuestionKeyRef = useRef<string | null>(null);
  const invalidatedByLearnTabRef = useRef(false);
  const lastCopyToastRef = useRef(0);

  useEffect(() => {
    fetchQuranMeta()
      .then((meta) => {
        const names: Record<number, string> = {};
        for (const s of meta.surahs) names[s.id] = s.name;
        setSurahNames(names);
      })
      .catch(() => {});

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
      const sid =
        TAJWID_QUIZ_SURAH_POOL[Math.floor(Math.random() * TAJWID_QUIZ_SURAH_POOL.length)];
      const map = await fetchSurahTajwid(sid);
      const nextQ = buildTajwidQuestion(sid, map, lastQuestionKeyRef.current);
      if (!nextQ) return;
      lastQuestionKeyRef.current = getQuestionKey(nextQ);
      setQuestion(nextQ);
    } finally {
      setQuizBusy(false);
    }
  }

  function handleOpenLearnTab() {
    if (shouldInvalidateQuestionOnLearnTab(Boolean(question), Boolean(picked))) {
      invalidatedByLearnTabRef.current = true;
      setQuestion(null);
      setPicked(null);
    }
    setTab('learn');
  }

  function handleOpenPracticeTab() {
    setTab('practice');
    if (invalidatedByLearnTabRef.current) {
      invalidatedByLearnTabRef.current = false;
      showToast('Soal diacak ulang karena materi tajwid sempat dibuka.', { variant: 'info' });
      void nextQuestion();
      return;
    }
    if (!question) {
      void nextQuestion();
    }
  }

  function handleBlockQuizCopy(e: Event) {
    e.preventDefault();
    const now = Date.now();
    if (now - lastCopyToastRef.current > 2500) {
      lastCopyToastRef.current = now;
      showToast('Menyalin teks dinonaktifkan selama latihan tajwid.');
    }
  }

  function handleSelectOption(opt: TajwidGroup) {
    if (!question) return;
    const result = evaluateTajwidAnswer(picked, opt, question.correctGroup, score);
    if (!result.accepted) return;
    setPicked(result.picked);
    setScore(result.score);
  }

  const answered = Boolean(picked);
  const showSource = shouldShowQuestionSource(answered);

  return (
    <div>
      <PageHeader
        title="Tajwid"
        description="Hukum bacaan Al-Qur'an dengan 12 kode warna, contoh ayat beraudio, dan latihan interaktif."
      />

      <div class="mb-6 inline-flex rounded-xl bg-[var(--muted)] p-1">
        <button
          type="button"
          onClick={handleOpenLearnTab}
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
          onClick={handleOpenPracticeTab}
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
          <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 class="text-base font-bold">Tebak hukum tajwid</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                Soal diambil acak dari Al-Fatihah dan Juz &lsquo;Amma.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <Badge>
                <ShieldCheck class="size-3 text-[var(--primary)]" />
                Mode latihan adil
              </Badge>
              <Badge variant="primary" class="tabular-nums">
                {score.correct} dari {score.total} benar
              </Badge>
            </div>
          </div>

          {quizBusy || !question ? (
            <p class="py-12 text-center text-sm text-[var(--muted-foreground)]">Menyiapkan soal…</p>
          ) : (
            <div class="space-y-5">
              <div
                onCopy={handleBlockQuizCopy}
                onCut={handleBlockQuizCopy}
                onContextMenu={handleBlockQuizCopy}
                onDragStart={handleBlockQuizCopy}
                class="select-none rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5"
              >
                <p class="mb-2 text-xs text-[var(--muted-foreground)]">
                  {showSource
                    ? `QS. ${surahNames[question.surahId] || `Surah ${question.surahId}`}: ${question.ayahNumber} — warna hukum tajwid kini ditampilkan.`
                    : 'Hukum apa pada bagian yang ditandai kotak?'}
                </p>
                <p class="tajwid-text text-right text-3xl text-[var(--foreground)]" dir="rtl" lang="ar">
                  {question.segments.map(([txt, grp], idx) => {
                    const cls = getSegmentQuizClassName(idx === question.targetIdx, answered, grp);
                    return cls ? (
                      <span key={idx} class={cls}>
                        {txt}
                      </span>
                    ) : (
                      <span key={idx}>{txt}</span>
                    );
                  })}
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
                      disabled={answered}
                      onClick={() => handleSelectOption(opt)}
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
                  <div class="space-y-0.5">
                    <p class="font-semibold text-[var(--foreground)]">
                      {picked === question.correctGroup
                        ? 'Benar!'
                        : `Belum tepat. Jawabannya: ${TAJWID_RULE_MAP[question.correctGroup].name}.`}
                    </p>
                    <p class="text-[var(--muted-foreground)]">
                      {TAJWID_RULE_MAP[question.correctGroup].shortDesc}
                    </p>
                    <p class="pt-0.5 text-[var(--muted-foreground)]">
                      Sumber:{' '}
                      <a
                        href={`/app/baca/${question.surahId}?ayat=${question.ayahNumber}`}
                        class="font-semibold text-[var(--primary)] hover:underline"
                      >
                        QS. {surahNames[question.surahId] || `Surah ${question.surahId}`}: {question.ayahNumber}
                      </a>
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
