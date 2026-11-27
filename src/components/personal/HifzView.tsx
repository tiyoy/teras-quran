import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  BookHeart,
  BookOpen,
  Eye,
  Layers,
  Play,
  Repeat,
  Trash2,
} from 'lucide-preact';
import {
  dueHifzItems,
  hifzItems,
  hifzJuzProgress,
  hifzSurahProgress,
  hifzTotals,
  importBulkHifz,
  removeHifzItem,
  reviewHifzItem,
  weakHifzItems,
} from '@/stores/hifz';
import { getHifzStrength, type HifzItem, type HifzRating } from '@/lib/hifz/sm2';
import { fetchQuranMeta, fetchSurahAyahs, type Ayah, type SurahMeta } from '@/lib/quran/api';
import { playAyah } from '@/stores/audio-player';
import { showToast } from '@/stores/toast';
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui/Primitives';

const STRENGTH_META = {
  weak: { label: 'Lemah', variant: 'destructive' as const },
  fair: { label: 'Cukup', variant: 'gold' as const },
  strong: { label: 'Kuat', variant: 'success' as const },
};

export function HifzView() {
  const [tab, setTab] = useState<'today' | 'all' | 'progress'>('today');
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [weakOnly, setWeakOnly] = useState(false);

  // Bulk import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importKind, setImportKind] = useState<'surah' | 'juz'>('surah');
  const [importId, setImportId] = useState(114);

  // Murajaah review modal
  const [reviewQueue, setReviewQueue] = useState<HifzItem[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewAyahs, setReviewAyahs] = useState<Ayah[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, []);

  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs]);
  const activeReview = reviewQueue[reviewIdx] ?? null;

  useEffect(() => {
    if (!activeReview) {
      setReviewAyahs([]);
      return;
    }
    setRevealed(false);
    fetchSurahAyahs(activeReview.surahId)
      .then((list) =>
        setReviewAyahs(
          list.filter((a) => a.n >= activeReview.fromAyah && a.n <= activeReview.toAyah)
        )
      )
      .catch(() => setReviewAyahs([]));
  }, [activeReview?.id]);

  function startReviewSession(items: HifzItem[]) {
    if (!items.length) return;
    setReviewQueue(items);
    setReviewIdx(0);
  }

  function submitRating(rating: HifzRating) {
    if (!activeReview) return;
    const updated = reviewHifzItem(activeReview.id, rating);
    const sName = surahMap.get(activeReview.surahId)?.name ?? `Surah ${activeReview.surahId}`;
    if (updated) {
      showToast(`${sName} ${updated.fromAyah}–${updated.toAyah}: murajaah berikutnya ${updated.dueDate}.`);
    }
    if (reviewIdx + 1 < reviewQueue.length) {
      setReviewIdx((i) => i + 1);
    } else {
      setReviewQueue([]);
      showToast('Murajaah selesai. Barakallahu fiik!', { variant: 'success' });
    }
  }

  const allItems = weakOnly ? weakHifzItems.value : hifzItems.value;
  const due = dueHifzItems.value;
  const totals = hifzTotals.value;

  return (
    <div>
      <PageHeader
        title="Hafalan"
        description="Catat hafalan, murajaah tepat waktu (SM-2), dan lihat progresmu."
        actions={
          <>
            <Button size="sm" variant="outline" href="/app/sambung-ayat">
              <Repeat class="size-3.5" />
              Latihan sambung ayat
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Layers class="size-3.5" />
              Tandai surah/juz
            </Button>
          </>
        }
      />

      {/* 3 Tabs */}
      <div class="mb-6 grid grid-cols-3 rounded-xl bg-[var(--muted)] p-1">
        {(
          [
            ['today', `Hari ini (${due.length})`],
            ['all', `Semua (${hifzItems.value.length})`],
            ['progress', 'Progres'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            class={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
              tab === id
                ? 'bg-[var(--card)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB: HARI INI */}
      {tab === 'today' &&
        (hifzItems.value.length === 0 ? (
          <EmptyState
            icon={<BookHeart class="size-5" />}
            title="Belum ada hafalan"
            description="Tandai ayat yang sudah kamu hafal dari menu ⋮ pada halaman baca, atau tandai satu surah atau juz sekaligus."
            action={
              <>
                <Button href="/app/surah" size="sm">
                  <BookOpen class="size-4" />
                  Buka Al-Qur&apos;an
                </Button>
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                  <Layers class="size-4" />
                  Tandai surah/juz
                </Button>
              </>
            }
          />
        ) : due.length === 0 ? (
          <EmptyState
            icon={<BookHeart class="size-5" />}
            title="Tidak ada murajaah hari ini"
            description="Semua hafalan sudah diulang sesuai jadwal. Barakallahu fiik!"
          />
        ) : (
          <div class="space-y-4">
            <Card class="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p class="text-sm font-semibold">{due.length} murajaah jatuh tempo hari ini</p>
                <p class="text-xs text-[var(--muted-foreground)]">
                  Uji hafalan dan beri nilai agar jadwal pengulangan otomatis disesuaikan.
                </p>
              </div>
              <Button size="sm" onClick={() => startReviewSession(due)}>
                Mulai murajaah
              </Button>
            </Card>

            <div class="space-y-2.5">
              {due.map((it) => {
                const sName = surahMap.get(it.surahId)?.name ?? `Surah ${it.surahId}`;
                const st = STRENGTH_META[getHifzStrength(it)];
                return (
                  <Card key={it.id} class="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-sm font-semibold">
                          {sName} · Ayat {it.fromAyah}
                          {it.toAyah > it.fromAyah ? `–${it.toAyah}` : ''}
                        </p>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p class="mt-0.5 text-xs text-[var(--muted-foreground)] tabular-nums">
                        {it.ayahCount} ayat · Jatuh tempo {it.dueDate}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => startReviewSession([it])}>
                      Murajaah
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

      {/* TAB: SEMUA */}
      {tab === 'all' && (
        <div class="space-y-4">
          <label class="inline-flex items-center gap-2 text-xs font-medium text-[var(--foreground)] cursor-pointer">
            <input
              type="checkbox"
              checked={weakOnly}
              onChange={(e) => setWeakOnly((e.target as HTMLInputElement).checked)}
            />
            Tampilkan hanya hafalan yang lemah
          </label>

          {allItems.length === 0 ? (
            <EmptyState
              icon={<BookHeart class="size-5" />}
              title={weakOnly ? 'Tidak ada hafalan yang lemah' : 'Belum ada hafalan'}
              description={
                weakOnly
                  ? 'Semua hafalanmu saat ini dalam kondisi cukup atau kuat.'
                  : 'Tambahkan hafalan dari menu ayat atau tombol Tandai surah/juz.'
              }
            />
          ) : (
            <div class="space-y-2.5">
              {allItems.map((it) => {
                const sName = surahMap.get(it.surahId)?.name ?? `Surah ${it.surahId}`;
                const st = STRENGTH_META[getHifzStrength(it)];
                return (
                  <Card key={it.id} class="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold">
                          {sName} · Ayat {it.fromAyah}
                          {it.toAyah > it.fromAyah ? `–${it.toAyah}` : ''}
                        </p>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p class="mt-0.5 text-xs text-[var(--muted-foreground)] tabular-nums">
                        {it.ayahCount} ayat · Murajaah berikutnya {it.dueDate} · Interval {it.interval} hari
                      </p>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => startReviewSession([it])}>
                        Murajaah
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Hapus hafalan"
                        onClick={() => removeHifzItem(it.id)}
                      >
                        <Trash2 class="size-4 text-[var(--destructive)]" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: PROGRES */}
      {tab === 'progress' && (
        <div class="space-y-5">
          <div class="grid grid-cols-3 gap-3">
            <Card class="p-4 text-center">
              <p class="text-2xl font-bold tabular-nums text-[var(--primary)]">{totals.ayahs}</p>
              <p class="text-xs text-[var(--muted-foreground)]">Ayat dihafal</p>
            </Card>
            <Card class="p-4 text-center">
              <p class="text-2xl font-bold tabular-nums text-[var(--primary)]">{totals.surahs}</p>
              <p class="text-xs text-[var(--muted-foreground)]">Surah selesai</p>
            </Card>
            <Card class="p-4 text-center">
              <p class="text-2xl font-bold tabular-nums text-[var(--primary)]">{totals.juz}</p>
              <p class="text-xs text-[var(--muted-foreground)]">Juz selesai</p>
            </Card>
          </div>

          <Card class="p-5">
            <h3 class="mb-3 text-sm font-semibold">Progres per Juz</h3>
            <div class="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {hifzJuzProgress.value.map((cov, idx) => (
                <div
                  key={idx + 1}
                  title={`Juz ${idx + 1}: ${Math.round(cov * 100)}%`}
                  class={`flex h-10 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums ${
                    cov >= 1
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : cov > 0
                        ? 'border-[var(--primary)]/40 bg-[var(--accent)] text-[var(--accent-foreground)]'
                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          </Card>

          <Card class="p-5">
            <h3 class="mb-3 text-sm font-semibold">Surah yang sedang/sudah dihafal</h3>
            <div class="space-y-2">
              {hifzSurahProgress.value
                .filter((sp) => sp.memorized > 0)
                .map((sp) => {
                  const s = surahMap.get(sp.surahId);
                  const pct = Math.round((sp.memorized / sp.total) * 100);
                  return (
                    <div key={sp.surahId} class="space-y-1">
                      <div class="flex justify-between text-xs">
                        <span class="font-medium">{s?.name ?? `Surah ${sp.surahId}`}</span>
                        <span class="tabular-nums text-[var(--muted-foreground)]">
                          {sp.memorized}/{sp.total} ({pct}%)
                        </span>
                      </div>
                      <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                        <div class="h-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              {hifzSurahProgress.value.every((sp) => sp.memorized === 0) && (
                <p class="text-xs text-[var(--muted-foreground)]">Belum ada surah yang dihafal.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Import Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Tandai satu surah atau juz"
        description="Untuk hafalan yang sudah kamu kuasai. Jadwal murajaah disebar bertahap dalam 30 hari."
      >
        <div class="space-y-4 text-sm">
          <div class="grid grid-cols-2 rounded-xl bg-[var(--muted)] p-1">
            <button
              type="button"
              onClick={() => {
                setImportKind('surah');
                setImportId(114);
              }}
              class={`rounded-lg py-1.5 text-xs font-semibold cursor-pointer ${
                importKind === 'surah' ? 'bg-[var(--card)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
              }`}
            >
              Surah
            </button>
            <button
              type="button"
              onClick={() => {
                setImportKind('juz');
                setImportId(30);
              }}
              class={`rounded-lg py-1.5 text-xs font-semibold cursor-pointer ${
                importKind === 'juz' ? 'bg-[var(--card)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
              }`}
            >
              Juz
            </button>
          </div>

          {importKind === 'surah' ? (
            <select
              value={importId}
              onChange={(e) => setImportId(Number((e.target as HTMLSelectElement).value))}
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
            >
              {surahs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.name} ({s.ayahCount} ayat)
                </option>
              ))}
            </select>
          ) : (
            <select
              value={importId}
              onChange={(e) => setImportId(Number((e.target as HTMLSelectElement).value))}
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                <option key={j} value={j}>
                  Juz {j}
                </option>
              ))}
            </select>
          )}

          <div class="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => {
                importBulkHifz(importKind, importId);
                setImportOpen(false);
              }}
            >
              Tandai sudah hafal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Murajaah Session Modal */}
      {activeReview && (
        <Modal
          open={Boolean(activeReview)}
          onClose={() => setReviewQueue([])}
          title={`Murajaah (${reviewIdx + 1}/${reviewQueue.length})`}
          description={`${surahMap.get(activeReview.surahId)?.name ?? `Surah ${activeReview.surahId}`} · Ayat ${activeReview.fromAyah}–${activeReview.toAyah}`}
          maxWidth="max-w-xl"
        >
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRevealed((r) => !r)}
              >
                <Eye class="size-3.5" />
                {revealed ? 'Sembunyikan teks' : 'Tampilkan teks ayat'}
              </Button>
              {reviewAyahs.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    playAyah(
                      reviewAyahs[0],
                      reviewAyahs,
                      surahMap.get(activeReview.surahId)?.name ?? ''
                    )
                  }
                >
                  <Play class="size-3.5" />
                  Putar audio
                </Button>
              )}
            </div>

            <div class="max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              {revealed ? (
                <div class="space-y-3">
                  {reviewAyahs.map((a) => (
                    <p key={a.i} class="quran-text text-right text-2xl text-[var(--foreground)]" dir="rtl" lang="ar">
                      {a.ar}{' '}
                      <span class="font-sans text-xs font-semibold text-[var(--primary)]">({a.n})</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p class="py-10 text-center text-sm text-[var(--muted-foreground)]">
                  Teks disembunyikan. Ucapkan hafalanmu terlebih dahulu, lalu tekan &ldquo;Tampilkan teks ayat&rdquo; untuk memeriksa.
                </p>
              )}
            </div>

            <div>
              <p class="mb-2 text-xs font-semibold text-[var(--muted-foreground)]">
                Bagaimana murajaahmu?
              </p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button size="sm" variant="destructive" onClick={() => submitRating(1)}>
                  Lupa
                </Button>
                <Button size="sm" variant="outline" onClick={() => submitRating(3)}>
                  Sulit
                </Button>
                <Button size="sm" variant="secondary" onClick={() => submitRating(4)}>
                  Lancar
                </Button>
                <Button size="sm" onClick={() => submitRating(5)}>
                  Sangat lancar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
