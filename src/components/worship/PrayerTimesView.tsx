import { useEffect, useMemo, useState } from 'preact/hooks';
import { Clock, Moon, Sun, Sunrise, Sunset } from 'lucide-preact';
import {
  computeDailyPrayerTimes,
  computeMonthlyPrayerTimes,
  formatPrayerClock,
  getNextPrayer,
  type PrayerName,
} from '@/lib/worship/prayer-times';
import { formatHijriDate, getRamadanStatus, HIJRI_OFFSETS } from '@/lib/worship/hijri';
import { setHijriOffset, userLocation } from '@/stores/location';
import { Button, Card, PageHeader } from '@/components/ui/Primitives';
import { LocationBar } from './LocationBar';

const PRAYER_META: Array<{ key: PrayerName; label: string; icon: typeof Sun }> = [
  { key: 'imsak', label: 'Imsak', icon: Moon },
  { key: 'fajr', label: 'Subuh', icon: Sunrise },
  { key: 'sunrise', label: 'Terbit', icon: Sun },
  { key: 'dhuhr', label: 'Dzuhur', icon: Sun },
  { key: 'asr', label: 'Ashar', icon: Sun },
  { key: 'maghrib', label: 'Maghrib', icon: Sunset },
  { key: 'isha', label: 'Isya', icon: Moon },
];

const DAY_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  if (totalMin < 1) return 'kurang dari 1 menit';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} menit`;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
}

export function PrayerTimesView() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const loc = userLocation.value;
  const today = useMemo(() => computeDailyPrayerTimes(now, loc.lat, loc.lng), [now.toDateString(), loc.lat, loc.lng]);
  const next = getNextPrayer(now, loc.lat, loc.lng);
  const monthRows = useMemo(
    () => computeMonthlyPrayerTimes(now.getFullYear(), now.getMonth(), loc.lat, loc.lng),
    [now.getFullYear(), now.getMonth(), loc.lat, loc.lng]
  );

  const hijriToday = formatHijriDate(now, loc.hijriOffset, 'id', loc.timezone, 'long');
  const ramadan = getRamadanStatus(now, loc.hijriOffset, loc.timezone);
  const nextLabel = PRAYER_META.find((p) => p.key === next.name)?.label ?? next.name;
  const todayNum = now.getDate();

  return (
    <div class="space-y-5">
      <PageHeader
        title="Jadwal sholat"
        description="Waktu sholat dan imsak dihitung langsung di perangkatmu mengikuti kriteria Kemenag RI."
      />

      <LocationBar />

      {/* Next Prayer + Hijri Date */}
      <div class="grid gap-4 sm:grid-cols-2">
        <Card class="p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              Sholat berikutnya
            </p>
            <Clock class="size-4 text-[var(--primary)]" />
          </div>
          <p class="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {nextLabel} · {formatPrayerClock(next.time, loc.timezone)}
          </p>
          <p class="mt-1 text-xs text-[var(--muted-foreground)]">
            {next.isTomorrow ? `${nextLabel} besok, ` : ''}dalam {formatCountdown(next.diffMs)}
          </p>
        </Card>

        <Card class="p-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            Tanggal Hijriah
          </p>
          <p class="mt-2 text-xl font-bold tracking-tight">{hijriToday}</p>
          {ramadan && (
            <p class="mt-1 text-xs font-medium text-[var(--gold-ink)] dark:text-[var(--gold)]">
              {ramadan.kind === 'during'
                ? `Hari ke-${ramadan.day} Ramadan ${ramadan.year} H`
                : ramadan.days === 1
                  ? `Ramadan ${ramadan.year} H dimulai besok`
                  : `${ramadan.days} hari menuju Ramadan ${ramadan.year} H`}
            </p>
          )}
          <div class="mt-3 flex flex-wrap items-center gap-1">
            <span class="mr-1 text-[11px] text-[var(--muted-foreground)]">Koreksi:</span>
            {HIJRI_OFFSETS.map((off) => (
              <Button
                key={off}
                size="sm"
                variant={loc.hijriOffset === off ? 'primary' : 'outline'}
                class="h-6 px-2 text-[11px] tabular-nums"
                onClick={() => setHijriOffset(off)}
              >
                {off > 0 ? `+${off}` : off}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's 7 Times */}
      <Card class="p-5">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h2 class="text-sm font-semibold">Jadwal sholat hari ini</h2>
          <span class="text-xs text-[var(--muted-foreground)]">
            {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(now)}
          </span>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PRAYER_META.map((item) => {
            const Icon = item.icon;
            const isNext = !next.isTomorrow && next.name === item.key;
            return (
              <div
                key={item.key}
                class={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
                  isNext
                    ? 'border-[var(--primary)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'border-[var(--border)] bg-[var(--background)]'
                }`}
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <Icon
                    class={`size-4 shrink-0 ${
                      isNext ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                    }`}
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium leading-tight">{item.label}</p>
                    {isNext && (
                      <span class="mt-1 inline-block rounded bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--primary)]">
                        Berikutnya
                      </span>
                    )}
                  </div>
                </div>
                <span class="shrink-0 text-sm font-bold tabular-nums">
                  {formatPrayerClock(today[item.key], loc.timezone)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Monthly Table */}
      <Card class="overflow-hidden">
        <div class="border-b border-[var(--border)] px-5 py-4">
          <h2 class="text-sm font-semibold">
            Jadwal bulan{' '}
            {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)}
          </h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] table-fixed text-xs">
            <colgroup>
              <col class="w-[16%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
            </colgroup>
            <thead class="border-b border-[var(--border)] bg-[var(--muted)]/60 text-[var(--muted-foreground)]">
              <tr>
                <th class="py-2.5 pl-5 pr-3 text-left font-semibold">Tanggal</th>
                <th class="px-2 py-2.5 text-center font-semibold">Imsak</th>
                <th class="px-2 py-2.5 text-center font-semibold">Subuh</th>
                <th class="px-2 py-2.5 text-center font-semibold">Terbit</th>
                <th class="px-2 py-2.5 text-center font-semibold">Dzuhur</th>
                <th class="px-2 py-2.5 text-center font-semibold">Ashar</th>
                <th class="px-2 py-2.5 text-center font-semibold">Maghrib</th>
                <th class="py-2.5 pl-2 pr-5 text-center font-semibold">Isya</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border)]">
              {monthRows.map((row) => {
                const dayNum = row.date.getDate();
                const isToday = dayNum === todayNum;
                return (
                  <tr
                    key={row.date.toISOString()}
                    class={
                      isToday
                        ? 'bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]'
                        : 'transition-colors hover:bg-[var(--muted)]/40'
                    }
                  >
                    <td class="whitespace-nowrap py-2.5 pl-5 pr-3 text-left">
                      <span class="inline-flex items-center gap-2">
                        <span class="inline-block w-5 font-mono font-medium tabular-nums">
                          {String(dayNum).padStart(2, '0')}
                        </span>
                        <span
                          class={
                            isToday
                              ? 'text-[var(--accent-foreground)]'
                              : 'text-[var(--muted-foreground)]'
                          }
                        >
                          {DAY_SHORT_ID[row.date.getDay()]}
                        </span>
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-center font-mono tabular-nums tracking-tight">
                      {formatPrayerClock(row.imsak, loc.timezone)}
                    </td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-center font-mono tabular-nums tracking-tight">
                      {formatPrayerClock(row.fajr, loc.timezone)}
                    </td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-center font-mono tabular-nums tracking-tight">
                      {formatPrayerClock(row.sunrise, loc.timezone)}
                    </td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-center font-mono tabular-nums tracking-tight">
                      {formatPrayerClock(row.dhuhr, loc.timezone)}
                    </td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-center font-mono tabular-nums tracking-tight">
                      {formatPrayerClock(row.asr, loc.timezone)}
                    </td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-center font-mono tabular-nums tracking-tight">
                      {formatPrayerClock(row.maghrib, loc.timezone)}
                    </td>
                    <td class="whitespace-nowrap py-2.5 pl-2 pr-5 text-center font-mono tabular-nums tracking-tight">
                      {formatPrayerClock(row.isha, loc.timezone)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p class="text-xs leading-relaxed text-[var(--muted-foreground)]">
        Dihitung di perangkatmu dengan kriteria Kemenag RI: Subuh 20°, Isya 18°, Ashar mazhab Syafi&apos;i, ihtiyat 2 menit, dan imsak 10 menit sebelum Subuh.
      </p>
    </div>
  );
}
