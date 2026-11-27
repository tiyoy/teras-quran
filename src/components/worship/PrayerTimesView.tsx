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
import { Badge, Button, Card, PageHeader } from '@/components/ui/Primitives';
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
        <div class="mb-3 flex items-center justify-between">
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
                class={`flex items-center justify-between rounded-xl border px-3.5 py-3 ${
                  isNext
                    ? 'border-[var(--primary)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'border-[var(--border)] bg-[var(--background)]'
                }`}
              >
                <span class="flex items-center gap-2 text-sm font-medium">
                  <Icon class={`size-4 ${isNext ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                  {item.label}
                </span>
                <div class="flex items-center gap-1.5">
                  {isNext && <Badge variant="primary">Berikutnya</Badge>}
                  <span class="text-sm font-bold tabular-nums">
                    {formatPrayerClock(today[item.key], loc.timezone)}
                  </span>
                </div>
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
          <table class="w-full text-left text-xs tabular-nums">
            <thead class="border-b border-[var(--border)] bg-[var(--muted)]/60 text-[var(--muted-foreground)]">
              <tr>
                <th class="px-4 py-2.5 font-semibold">Tanggal</th>
                <th class="px-3 py-2.5 font-semibold">Imsak</th>
                <th class="px-3 py-2.5 font-semibold">Subuh</th>
                <th class="px-3 py-2.5 font-semibold">Terbit</th>
                <th class="px-3 py-2.5 font-semibold">Dzuhur</th>
                <th class="px-3 py-2.5 font-semibold">Ashar</th>
                <th class="px-3 py-2.5 font-semibold">Maghrib</th>
                <th class="px-3 py-2.5 font-semibold">Isya</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border)]">
              {monthRows.map((row) => {
                const isToday = row.date.getDate() === todayNum;
                return (
                  <tr
                    key={row.date.toISOString()}
                    class={isToday ? 'bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]' : ''}
                  >
                    <td class="whitespace-nowrap px-4 py-2.5">
                      {new Intl.DateTimeFormat('id-ID', { day: 'numeric', weekday: 'short' }).format(row.date)}
                    </td>
                    <td class="px-3 py-2.5">{formatPrayerClock(row.imsak, loc.timezone)}</td>
                    <td class="px-3 py-2.5">{formatPrayerClock(row.fajr, loc.timezone)}</td>
                    <td class="px-3 py-2.5">{formatPrayerClock(row.sunrise, loc.timezone)}</td>
                    <td class="px-3 py-2.5">{formatPrayerClock(row.dhuhr, loc.timezone)}</td>
                    <td class="px-3 py-2.5">{formatPrayerClock(row.asr, loc.timezone)}</td>
                    <td class="px-3 py-2.5">{formatPrayerClock(row.maghrib, loc.timezone)}</td>
                    <td class="px-3 py-2.5">{formatPrayerClock(row.isha, loc.timezone)}</td>
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
