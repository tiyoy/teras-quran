import { useEffect, useState } from 'preact/hooks';
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  Bookmark,
  CircleDot,
  Clock,
  Flame,
  Heart,
  Layers,
  NotebookPen,
  Play,
  Search,
  Speech,
  Star,
  TrendingUp,
} from 'lucide-preact';
import {
  fetchAyahsByGlobalIds,
  fetchQuranMeta,
  getDailyAyahGlobalId,
  type Ayah,
  type SurahMeta,
} from '@/lib/quran/api';
import { addDaysToDateKey, formatDateKey } from '@/lib/quran/meta';
import { formatPrayerClock, getNextPrayer, type PrayerName } from '@/lib/worship/prayer-times';
import { authUser, initAuthListener, userProfile } from '@/stores/auth';
import { favorites, isFavoriteAyah, lastRead, notes, savedSurahs, toggleFavoriteAyah } from '@/stores/library';
import { currentStreak, longestStreak, readingDays, todayLog, todayTargetAyahs } from '@/stores/progress';
import { dueHifzItems, hifzTotals } from '@/stores/hifz';
import { DEFAULT_CITY } from '@/data/cities-id';
import { userLocation, type SavedLocation } from '@/stores/location';
import { activeTasbihCounter, activeTasbihPreset, todayTasbihCount } from '@/stores/tasbih';
import { playAyah } from '@/stores/audio-player';
import { getTranslationText } from '@/stores/reader-settings';
import { Badge, Button, Card } from '@/components/ui/Primitives';

const SSR_LOCATION: SavedLocation = {
  name: DEFAULT_CITY.name,
  province: DEFAULT_CITY.province,
  lat: DEFAULT_CITY.lat,
  lng: DEFAULT_CITY.lng,
  timezone: DEFAULT_CITY.timezone,
  source: 'city',
  hijriOffset: 0,
};

const PRAYER_LABELS: Record<PrayerName, string> = {
  imsak: 'Imsak',
  fajr: 'Subuh',
  sunrise: 'Terbit',
  dhuhr: 'Dzuhur',
  asr: 'Ashar',
  maghrib: 'Maghrib',
  isha: 'Isya',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function formatCountdown(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 1) return 'kurang dari 1 menit';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} menit`;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
}

export function DashboardView() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [dailyAyah, setDailyAyah] = useState<Ayah | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initAuthListener();
    const t = setInterval(() => setNow(new Date()), 30_000);
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
    const dailyId = getDailyAyahGlobalId();
    fetchAyahsByGlobalIds([dailyId])
      .then((list) => setDailyAyah(list[0] ?? null))
      .catch(() => {});
    return () => clearInterval(t);
  }, []);

  const name = mounted
    ? userProfile.value?.displayName || authUser.value?.displayName || ''
    : '';
  const lr = mounted ? lastRead.value : null;
  const lrSurah = lr ? surahs.find((s) => s.id === lr.surahId) : null;
  const dailySurah = dailyAyah ? surahs.find((s) => s.id === dailyAyah.surahId) : null;

  const loc = mounted ? userLocation.value : SSR_LOCATION;
  const nextPrayer = mounted ? getNextPrayer(now, loc.lat, loc.lng) : null;

  // Hydration-safe personal stats (match SSR on first pass, populate on mount)
  const todayCount = mounted ? todayLog.value.ayahCount : 0;
  const todayGoalMet = mounted ? todayLog.value.goalMet : false;
  const targetAyahs = mounted ? todayTargetAyahs.value : 0;
  const streakVal = mounted ? currentStreak.value : 0;
  const bestStreakVal = mounted ? longestStreak.value : 0;
  const dueHifzCount = mounted ? dueHifzItems.value.length : 0;
  const hifzAyahTotal = mounted ? hifzTotals.value.ayahs : 0;
  const favCount = mounted ? favorites.value.length : 0;
  const notesCount = mounted ? notes.value.length : 0;
  const savedSurahsCount = mounted ? savedSurahs.value.length : 0;
  const tasbihToday = mounted ? todayTasbihCount.value : 0;
  const tasbihPreset = mounted
    ? activeTasbihPreset.value
    : { id: 'subhanallah', title: 'Subhanallah', arabic: 'سُبْحَانَ اللّٰهِ', target: 33 };
  const tasbihCount = mounted ? activeTasbihCounter.value.count : 0;

  // 7-day reading chart data
  const todayKey = mounted ? formatDateKey(now) : '';
  const last7 = mounted
    ? Array.from({ length: 7 }, (_, i) => {
        const key = addDaysToDateKey(todayKey, i - 6);
        const [y, m, d] = key.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const dayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(dt);
        const log = readingDays.value[key];
        return { key, dayLabel, count: log?.ayahCount ?? 0, met: log?.goalMet ?? false, isToday: i === 6 };
      })
    : Array.from({ length: 7 }, (_, i) => ({
        key: `slot-${i}`,
        dayLabel: '—',
        count: 0,
        met: false,
        isToday: i === 6,
      }));
  const max7 = Math.max(10, ...last7.map((d) => d.count));
  const sum7 = last7.reduce((acc, d) => acc + d.count, 0);

  return (
    <div class="space-y-6">
      {/* Header Greeting */}
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {mounted ? getGreeting() : 'Assalamu\u2019alaikum'}
          {name ? `, ${name}` : ''}
        </h1>
        <p class="mt-0.5 text-sm text-[var(--muted-foreground)]">
          Semoga hari ini penuh keberkahan bersama Al-Qur&apos;an.
        </p>
      </div>

      {/* Continue Reading / Quick Start */}
      {lr ? (
        <Card key="dash-continue" class="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div class="flex items-start gap-3.5">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">
              <Bookmark class="size-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Lanjutkan membaca
              </p>
              <p class="mt-0.5 text-lg font-bold text-[var(--foreground)]">
                {lrSurah?.name ?? `Surah ${lr.surahId}`} · Ayat {lr.ayahNumber}
              </p>
              <p class="text-xs text-[var(--muted-foreground)] tabular-nums">
                Juz {lr.juz} · Halaman {lr.page}
              </p>
            </div>
          </div>
          <Button href={`/app/baca/${lr.surahId}?ayat=${lr.ayahNumber}`} size="sm">
            Lanjutkan dari sini
            <ArrowRight class="size-3.5" />
          </Button>
        </Card>
      ) : (
        <Card key="dash-start" class="p-5">
          <p class="text-sm font-semibold">Mulai membaca</p>
          <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Belum ada bacaan terakhir. Pilih salah satu surah berikut atau buka daftar lengkap.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" href="/app/baca/1">Al-Fatihah</Button>
            <Button size="sm" variant="secondary" href="/app/baca/36">Yasin</Button>
            <Button size="sm" variant="secondary" href="/app/baca/67">Al-Mulk</Button>
            <Button size="sm" variant="secondary" href="/app/baca/78">Juz 30</Button>
            <Button size="sm" variant="outline" href="/app/surah">Semua surah →</Button>
          </div>
        </Card>
      )}

      {/* 4 Today Summary Cards */}
      <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <a href="/app/progres" class="no-underline">
          <Card class="h-full p-4 transition-colors hover:border-[var(--primary)]">
            <div class="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>Bacaan hari ini</span>
              <TrendingUp class="size-4 text-[var(--primary)]" />
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">
              {todayCount}
              <span class="ml-1 text-xs font-normal text-[var(--muted-foreground)]">
                {targetAyahs > 0 ? `/ ${targetAyahs} ayat` : 'ayat'}
              </span>
            </p>
            <p class="mt-1 text-xs text-[var(--muted-foreground)]">
              {todayGoalMet
                ? 'Target hari ini tercapai'
                : targetAyahs > 0
                  ? `${Math.max(0, targetAyahs - todayCount)} ayat lagi`
                  : 'Belum ada target harian'}
            </p>
          </Card>
        </a>

        <a href="/app/progres" class="no-underline">
          <Card class="h-full p-4 transition-colors hover:border-[var(--primary)]">
            <div class="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>Hari beruntun</span>
              <Flame class="size-4 text-[var(--primary)]" />
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">
              {streakVal}
              <span class="ml-1 text-xs font-normal text-[var(--muted-foreground)]">hari</span>
            </p>
            <p class="mt-1 text-xs text-[var(--muted-foreground)]">
              Terpanjang {bestStreakVal} hari
            </p>
          </Card>
        </a>

        <a href="/app/hafalan" class="no-underline">
          <Card class="h-full p-4 transition-colors hover:border-[var(--primary)]">
            <div class="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>{dueHifzCount > 0 ? 'Murajaah hari ini' : 'Hafalan'}</span>
              <BookHeart class="size-4 text-[var(--primary)]" />
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">
              {dueHifzCount > 0 ? dueHifzCount : hifzAyahTotal}
              <span class="ml-1 text-xs font-normal text-[var(--muted-foreground)]">
                {dueHifzCount > 0 ? 'jatuh tempo' : 'ayat dihafal'}
              </span>
            </p>
            <p class="mt-1 text-xs text-[var(--muted-foreground)]">
              {dueHifzCount > 0
                ? 'Siap diulang hari ini'
                : hifzAyahTotal > 0
                  ? 'Tidak ada murajaah hari ini'
                  : 'Tandai ayat yang dihafal'}
            </p>
          </Card>
        </a>

        <a href="/app/sholat" class="no-underline">
          <Card class="h-full p-4 transition-colors hover:border-[var(--primary)]">
            <div class="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>Sholat berikutnya</span>
              <Clock class="size-4 text-[var(--primary)]" />
            </div>
            <p class="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-bold tabular-nums text-[var(--foreground)]">
              <span>{nextPrayer ? PRAYER_LABELS[nextPrayer.name] : '—'}</span>
              <span class="text-base font-semibold text-[var(--primary)]">
                {nextPrayer ? formatPrayerClock(nextPrayer.time, loc.timezone) : '--:--'}
              </span>
            </p>
            <p class="mt-1 truncate text-xs text-[var(--muted-foreground)]">
              {nextPrayer ? `dalam ${formatCountdown(nextPrayer.diffMs)} · ${loc.name}` : loc.name}
            </p>
          </Card>
        </a>
      </div>

      {/* 7-Day Activity + Tasbih Quick Card */}
      <div class="grid gap-4 lg:grid-cols-12">
        <Card class="p-5 lg:col-span-7">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold">Minggu ini</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                {sum7 > 0 ? `${sum7} ayat dalam 7 hari terakhir` : 'Belum ada bacaan dalam 7 hari terakhir'}
              </p>
            </div>
            <a href="/app/progres" class="text-xs font-semibold text-[var(--primary)] hover:underline">
              Detail →
            </a>
          </div>
          <div class="grid h-28 grid-cols-7 items-end gap-2">
            {last7.map((d, idx) => {
              const pct = Math.max(8, Math.round((d.count / max7) * 100));
              return (
                <div key={idx} class="flex h-full flex-col items-center justify-end gap-1.5">
                  <div class="flex w-full flex-1 items-end">
                    <div
                      title={`${d.dayLabel}: ${d.count} ayat`}
                      style={{ height: d.count > 0 ? `${pct}%` : '6px' }}
                      class={`w-full rounded-t-md ${
                        d.met
                          ? 'bg-[var(--primary)]'
                          : d.count > 0
                            ? 'bg-[var(--primary)]/45'
                            : 'bg-[var(--muted)]'
                      }`}
                    />
                  </div>
                  <span
                    class={`text-[11px] ${
                      d.isToday
                        ? 'font-bold text-[var(--primary)]'
                        : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {d.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card class="flex flex-col justify-between p-5 lg:col-span-5">
          <div>
            <div class="flex items-center justify-between">
              <Badge variant="primary">
                <CircleDot class="size-3" />
                Tasbih Digital
              </Badge>
              <span class="text-xs text-[var(--muted-foreground)] tabular-nums">
                Hari ini: {tasbihToday}×
              </span>
            </div>
            <p class="mt-3 text-base font-bold text-[var(--foreground)]">
              {tasbihPreset.title}
            </p>
            {tasbihPreset.arabic && (
              <p class="quran-text mt-1 text-right text-xl text-[var(--primary)]" dir="rtl" lang="ar">
                {tasbihPreset.arabic}
              </p>
            )}
            <p class="mt-1 text-xs text-[var(--muted-foreground)] tabular-nums">
              Hitungan aktif: {tasbihCount}
              {tasbihPreset.target > 0 ? ` / ${tasbihPreset.target}` : ' (tanpa batas)'}
            </p>
          </div>
          <Button href="/app/tasbih" size="sm" variant="secondary" class="mt-4 w-full">
            Lanjutkan dzikir
            <ArrowRight class="size-3.5" />
          </Button>
        </Card>
      </div>

      {/* Daily Ayah */}
      {dailyAyah && dailySurah && (
        <Card class="p-5 sm:p-6">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Ayat hari ini
              </p>
              <p class="text-xs text-[var(--muted-foreground)]">
                QS. {dailySurah.name} · Ayat {dailyAyah.n}
              </p>
            </div>
            <div class="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => playAyah(dailyAyah, [dailyAyah], dailySurah.name)}
              >
                <Play class="size-3.5" />
                Putar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleFavoriteAyah(dailyAyah.i, dailyAyah.surahId, dailyAyah.n)}
              >
                <Heart
                  class={`size-3.5 ${
                    isFavoriteAyah(dailyAyah.i) ? 'fill-current text-[var(--destructive)]' : ''
                  }`}
                />
              </Button>
              <Button size="sm" href={`/app/baca/${dailyAyah.surahId}?ayat=${dailyAyah.n}`}>
                Buka
              </Button>
            </div>
          </div>
          <p class="quran-text text-right text-2xl text-[var(--foreground)] sm:text-3xl" dir="rtl" lang="ar">
            {dailyAyah.ar}
          </p>
          <p class="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {getTranslationText(dailyAyah)}
          </p>
        </Card>
      )}

      {/* Personal & Explore Quick Links */}
      <div class="grid gap-4 sm:grid-cols-2">
        <Card class="p-5">
          <h2 class="mb-3 text-sm font-semibold">Milikku</h2>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <a
              href="/app/favorit"
              class="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-[var(--foreground)] hover:border-[var(--primary)] no-underline"
            >
              <span class="flex items-center gap-2 font-medium">
                <Heart class="size-4 text-[var(--primary)]" /> Favorit
              </span>
              <span class="font-semibold tabular-nums text-[var(--muted-foreground)]">
                {favCount}
              </span>
            </a>
            <a
              href="/app/catatan"
              class="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-[var(--foreground)] hover:border-[var(--primary)] no-underline"
            >
              <span class="flex items-center gap-2 font-medium">
                <NotebookPen class="size-4 text-[var(--primary)]" /> Catatan
              </span>
              <span class="font-semibold tabular-nums text-[var(--muted-foreground)]">
                {notesCount}
              </span>
            </a>
            <a
              href="/app/surah-pilihan"
              class="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-[var(--foreground)] hover:border-[var(--primary)] no-underline"
            >
              <span class="flex items-center gap-2 font-medium">
                <Star class="size-4 text-[var(--primary)]" /> Surah pilihan
              </span>
              <span class="font-semibold tabular-nums text-[var(--muted-foreground)]">
                {savedSurahsCount}
              </span>
            </a>
            <a
              href="/app/hafalan"
              class="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-[var(--foreground)] hover:border-[var(--primary)] no-underline"
            >
              <span class="flex items-center gap-2 font-medium">
                <BookHeart class="size-4 text-[var(--primary)]" /> Hafalan
              </span>
              <span class="font-semibold tabular-nums text-[var(--muted-foreground)]">
                {hifzAyahTotal}
              </span>
            </a>
          </div>
        </Card>

        <Card class="p-5">
          <h2 class="mb-3 text-sm font-semibold">Jelajahi Al-Qur&apos;an</h2>
          <div class="grid grid-cols-2 gap-2 text-xs">
            {[
              { href: '/app/surah', label: '114 Surah', icon: BookOpen },
              { href: '/app/juz', label: '30 Juz', icon: Layers },
              { href: '/app/tajwid', label: 'Belajar Tajwid', icon: Speech },
              { href: '/app/cari', label: 'Cari Ayat', icon: Search },
            ].map((it) => {
              const Icon = it.icon;
              return (
                <a
                  key={it.href}
                  href={it.href}
                  class="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3 font-medium text-[var(--foreground)] hover:border-[var(--primary)] no-underline"
                >
                  <Icon class="size-4 text-[var(--primary)]" />
                  {it.label}
                </a>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
