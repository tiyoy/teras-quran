import { useEffect, useState } from 'preact/hooks';
import { BookOpen, Flame, History, LogIn, RefreshCw, Target } from 'lucide-preact';
import {
  activeKhatam,
  currentStreak,
  khatamJuzProgress,
  khatamPercent,
  longestStreak,
  readingDays,
  readingGoal,
  setReadingGoal,
  startNewKhatam,
  todayLog,
  todayTargetAyahs,
  type ReadingGoal,
} from '@/stores/progress';
import { useAuthGate } from '@/components/auth/LoginRequired';
import { lastRead } from '@/stores/library';
import { addDaysToDateKey, formatDateKey, TOTAL_AYAHS } from '@/lib/quran/meta';
import { Button, Card, Modal, PageHeader } from '@/components/ui/Primitives';

const DAY_SHORT_ID = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'] as const;

export function ProgressView() {
  const [goalOpen, setGoalOpen] = useState(false);
  const [unit, setUnit] = useState<ReadingGoal['unit']>(readingGoal.value?.unit ?? 'ayah');
  const [amount, setAmount] = useState(readingGoal.value?.amount ?? 20);
  const [targetDate, setTargetDate] = useState(readingGoal.value?.targetDate ?? '');
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const authGate = useAuthGate();
  const loggedIn = authGate === 'authenticated';
  const today = mounted
    ? todayLog.value
    : { date: '', ayahIds: [] as number[], ayahCount: 0, goalMet: false, updatedAt: 0 };
  const targetAyahs = mounted ? todayTargetAyahs.value : 0;
  const lr = mounted ? lastRead.value : null;
  const juzCov = khatamJuzProgress.value;
  const khatam = activeKhatam.value;
  const streak = mounted ? currentStreak.value : 0;
  const bestStreak = mounted ? longestStreak.value : 0;

  const todayKey = mounted ? formatDateKey() : '';
  const weekDays = mounted
    ? Array.from({ length: 7 }, (_, i) => {
        const key = addDaysToDateKey(todayKey, i - 6);
        const [y, m, d] = key.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const short = DAY_SHORT_ID[dt.getDay()];
        const log = readingDays.value[key];
        return {
          key,
          dayNum: String(d),
          short,
          count: log?.ayahCount ?? 0,
          met: log?.goalMet ?? false,
          isToday: i === 6,
        };
      })
    : Array.from({ length: 7 }, (_, i) => ({
        key: `slot-${i}`,
        dayNum: '—',
        short: '—',
        count: 0,
        met: false,
        isToday: i === 6,
      }));

  const history30 = mounted
    ? Object.values(readingDays.value)
        .filter((d) => d.ayahCount > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30)
    : [];

  return (
    <div class="space-y-5">
      <PageHeader
        title="Progres bacaan"
        description="Target harian, hari beruntun dan khatam."
      />

      {/* Hari Ini Card */}
      <Card class="p-5 sm:p-6">
        <div class="mb-4 flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold">Hari ini</h2>
          <span
            class={`inline-flex items-center gap-1 text-xs tabular-nums ${
              streak > 0
                ? 'font-semibold text-[var(--gold-ink)] dark:text-[var(--gold)]'
                : 'font-medium text-[var(--muted-foreground)]'
            }`}
          >
            <Flame class={`size-3.5 ${streak > 0 ? 'text-[var(--gold)]' : 'text-[var(--muted-foreground)]'}`} />
            {streak > 0 ? `${streak} hari beruntun` : 'Belum ada hari beruntun'}
          </span>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--primary)]">
            <BookOpen class="size-6" />
          </div>
          <div>
            <p class="text-lg font-bold tabular-nums">
              {today.ayahCount} ayat dibaca hari ini
            </p>
            <p class="text-xs text-[var(--muted-foreground)]">
              {targetAyahs > 0
                ? today.goalMet
                  ? `Target harian (${targetAyahs} ayat) tercapai!`
                  : `${today.ayahCount} dari ${targetAyahs} ayat target harian.`
                : 'Belum ada target harian. Atur target agar tahu kapan bacaan hari ini cukup.'}
            </p>
          </div>
        </div>

        <div class="mt-5 border-t border-[var(--border)] pt-4">
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              href={lr ? `/app/baca/${lr.surahId}?ayat=${lr.ayahNumber}` : '/app/surah'}
            >
              <BookOpen class="size-3.5" />
              Lanjutkan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setUnit(readingGoal.value?.unit ?? 'ayah');
                setAmount(readingGoal.value?.amount ?? 20);
                setTargetDate(readingGoal.value?.targetDate ?? '');
                setGoalOpen(true);
              }}
            >
              <Target class="size-3.5" />
              {mounted && readingGoal.value ? 'Ubah target' : 'Atur target'}
            </Button>
          </div>

          {authGate === 'guest' && (
            <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted-foreground)]">
              <span>Progres disimpan di perangkat ini saja. Masuk agar tersimpan di semua perangkat.</span>
              <a
                href="/auth/login?redirect=%2Fapp%2Fprogres"
                class="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline no-underline"
              >
                <LogIn class="size-3.5" />
                Masuk
              </a>
            </p>
          )}
        </div>
      </Card>

      {/* 7 Hari Terakhir */}
      <Card class="p-5 sm:p-6">
        <div class="mb-4">
          <h2 class="text-sm font-semibold">7 hari terakhir</h2>
          {bestStreak > 0 && (
            <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Terpanjang {bestStreak} hari
            </p>
          )}
        </div>
        <div class="grid grid-cols-7 gap-2 text-center">
          {weekDays.map((d, idx) => (
            <div key={idx} class="flex flex-col items-center gap-1.5">
              <span class="text-[11px] text-[var(--muted-foreground)]">{d.short}</span>
              <div
                title={`${d.key}: ${d.count} ayat`}
                class={`flex size-10 items-center justify-center rounded-full text-xs tabular-nums ${
                  d.met
                    ? 'border-2 border-[var(--primary)] bg-[var(--primary)] font-semibold text-[var(--primary-foreground)]'
                    : d.count > 0
                      ? 'border-2 border-[var(--primary)] bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]'
                      : d.isToday
                        ? 'border-2 border-[var(--primary)] bg-[var(--background)] font-semibold text-[var(--foreground)]'
                        : 'border border-[var(--border)] bg-[var(--background)] font-medium text-[var(--foreground)]'
                }`}
              >
                {d.dayNum}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Khatam 30 Juz (Hydration-safe loading / Guest prompt / Authenticated tracker) */}
      {authGate === 'loading' ? (
        <div
          key="khatam-loading"
          role="status"
          aria-busy="true"
          aria-label="Memuat khatam…"
          class="h-36 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]"
        />
      ) : !loggedIn ? (
        <Card key="khatam-guest" class="p-5 sm:p-6">
          <h2 class="text-sm font-semibold">Khatam</h2>
          <p class="mt-2 text-sm text-[var(--muted-foreground)]">
            Masuk untuk melacak khatam dan menyimpannya di semua perangkat.
          </p>
          <div class="mt-3.5">
            <Button href="/auth/login?redirect=%2Fapp%2Fprogres" size="sm" variant="outline">
              <LogIn class="size-3.5" />
              Masuk
            </Button>
          </div>
        </Card>
      ) : (
        <Card key="khatam-auth" class="p-5 sm:p-6">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">Khatam</h2>
            <Button size="sm" variant="outline" onClick={() => setConfirmNewOpen(true)}>
              <RefreshCw class="size-3.5" />
              Mulai khatam baru
            </Button>
          </div>

          <div class="flex items-baseline justify-between">
            <p class="text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {khatamPercent.value}%
            </p>
            <p class="text-xs text-[var(--muted-foreground)] tabular-nums">
              {khatam.readCount.toLocaleString('id-ID')} dari {TOTAL_AYAHS.toLocaleString('id-ID')} ayat
            </p>
          </div>

          <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div class="h-full bg-[var(--primary)]" style={{ width: `${khatamPercent.value}%` }} />
          </div>

          <p class="mt-2.5 text-xs text-[var(--muted-foreground)]">
            {khatam.completedAt
              ? 'Alhamdulillah, khatam tercapai!'
              : 'Khatam pertamamu dimulai otomatis saat kamu mulai membaca.'}
          </p>

          <div class="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {juzCov.map((cov, idx) => {
              const state = cov >= 1 ? 'complete' : cov > 0 ? 'partial' : 'empty';
              return (
                <a
                  key={idx + 1}
                  href="/app/juz"
                  title={`Juz ${idx + 1}: ${Math.round(cov * 100)}%`}
                  class={`flex h-11 items-center justify-center rounded-xl border text-xs font-semibold tabular-nums no-underline ${
                    state === 'complete'
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : state === 'partial'
                        ? 'border-[var(--primary)]/50 bg-[var(--accent)] text-[var(--accent-foreground)]'
                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {idx + 1}
                </a>
              );
            })}
          </div>

          <div class="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--muted-foreground)]">
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2.5 rounded-full border border-[var(--border)] bg-[var(--background)]" />
              Belum
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2.5 rounded-full bg-[var(--accent)] border border-[var(--primary)]/50" />
              Sebagian
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2.5 rounded-full bg-[var(--primary)]" />
              Selesai
            </span>
          </div>
        </Card>
      )}

      {/* Riwayat 30 Hari */}
      <div>
        <h2 class="mb-3 text-sm font-semibold">Riwayat 30 hari</h2>
        {!mounted ? (
          <div
            key="history-loading"
            role="status"
            aria-busy="true"
            aria-label="Memuat riwayat bacaan…"
            class="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]"
          />
        ) : history30.length === 0 ? (
          <section
            key="history-empty"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center"
          >
            <div class="mb-3 flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
              <History class="size-4" />
            </div>
            <p class="max-w-xs text-sm font-medium text-[var(--foreground)]">
              Belum ada riwayat bacaan. Ayat yang kamu baca akan tercatat di sini.
            </p>
          </section>
        ) : (
          <Card key="history-list" class="overflow-hidden">
            <ul class="divide-y divide-[var(--border)]">
              {history30.map((d) => {
                const [y, m, day] = d.date.split('-').map(Number);
                const label = new Intl.DateTimeFormat('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(y, m - 1, day));
                return (
                  <li
                    key={d.date}
                    class="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-3 text-center text-sm"
                  >
                    <span class="text-[var(--foreground)]">{label}</span>
                    <span class="text-[var(--muted-foreground)]" aria-hidden="true">·</span>
                    <span class="whitespace-nowrap font-semibold tabular-nums text-[var(--primary)]">
                      {d.ayahCount.toLocaleString('id-ID')} ayat
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {/* Goal Modal */}
      <Modal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="Target harian"
        description="Pilih satuan dan jumlah yang ingin kamu baca setiap hari."
      >
        <div class="space-y-4 text-sm">
          <div>
            <p class="mb-1.5 text-xs font-medium text-[var(--muted-foreground)]">Pilihan cepat</p>
            <div class="flex flex-wrap gap-1.5">
              {[
                { label: '10 ayat', u: 'ayah' as const, a: 10 },
                { label: '2 halaman', u: 'page' as const, a: 2 },
                { label: '4 halaman', u: 'page' as const, a: 4 },
                { label: '1 juz', u: 'juz' as const, a: 1 },
              ].map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUnit(p.u);
                    setAmount(p.a);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs font-medium text-[var(--muted-foreground)]">
              Satuan
              <select
                id="progress-goal-unit"
                name="goalUnit"
                value={unit}
                onChange={(e) => setUnit((e.target as HTMLSelectElement).value as ReadingGoal['unit'])}
                class="mt-1 h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-2.5 text-sm text-[var(--foreground)]"
              >
                <option value="ayah">Ayat</option>
                <option value="page">Halaman</option>
                <option value="juz">Juz</option>
              </select>
            </label>
            <label class="text-xs font-medium text-[var(--muted-foreground)]">
              Jumlah per hari
              <input
                id="progress-goal-amount"
                name="goalAmount"
                type="number"
                min={1}
                value={amount}
                onInput={(e) => setAmount(Math.max(1, Number((e.target as HTMLInputElement).value)))}
                class="mt-1 h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] tabular-nums"
              />
            </label>
          </div>

          <label class="block text-xs font-medium text-[var(--muted-foreground)]">
            Target tanggal khatam (opsional)
            <input
              id="progress-goal-date"
              name="goalTargetDate"
              type="date"
              value={targetDate}
              onInput={(e) => setTargetDate((e.target as HTMLInputElement).value)}
              class="mt-1 h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
            />
          </label>

          <div class="flex justify-between pt-2">
            {readingGoal.value ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setReadingGoal(null);
                  setGoalOpen(false);
                }}
              >
                Hapus target
              </Button>
            ) : (
              <div />
            )}
            <div class="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setGoalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setReadingGoal({ unit, amount: Math.max(1, amount), targetDate: targetDate || null });
                  setGoalOpen(false);
                }}
              >
                Simpan target
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm New Khatam */}
      <Modal
        open={confirmNewOpen}
        onClose={() => setConfirmNewOpen(false)}
        title="Mulai khatam baru?"
        description="Khatam saat ini tetap tersimpan, tetapi bacaan berikutnya dihitung untuk khatam baru yang dimulai dari 0%."
      >
        <div class="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setConfirmNewOpen(false)}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={() => {
              startNewKhatam();
              setConfirmNewOpen(false);
            }}
          >
            Ya, mulai baru
          </Button>
        </div>
      </Modal>
    </div>
  );
}
