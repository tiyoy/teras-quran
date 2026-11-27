import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan';

export interface DailyPrayerSchedule {
  date: Date;
  imsak: Date;
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export type PrayerName = 'imsak' | 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/**
 * Kemenag RI calculation criteria:
 * - Fajr angle: 20°
 * - Isha angle: 18°
 * - Asr madhab: Shafi'i
 * - Ihtiyat: +2 minutes (Sunrise -2 minutes)
 * - Imsak: 10 minutes before Fajr
 */
function createKemenagParams() {
  const params = CalculationMethod.Singapore(); // Fajr 20°, Isha 18°
  params.fajrAngle = 20;
  params.ishaAngle = 18;
  params.madhab = Madhab.Shafi;
  params.adjustments.fajr = 2;
  params.adjustments.sunrise = -2;
  params.adjustments.dhuhr = 2;
  params.adjustments.asr = 2;
  params.adjustments.maghrib = 2;
  params.adjustments.isha = 2;
  return params;
}

export function computeDailyPrayerTimes(
  date: Date,
  lat: number,
  lng: number
): DailyPrayerSchedule {
  const coords = new Coordinates(lat, lng);
  const params = createKemenagParams();
  const pt = new PrayerTimes(coords, date, params);
  const imsak = new Date(pt.fajr.getTime() - 10 * 60 * 1000);

  return {
    date,
    imsak,
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

export function computeMonthlyPrayerTimes(
  year: number,
  monthIndex0: number,
  lat: number,
  lng: number
): DailyPrayerSchedule[] {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const out: DailyPrayerSchedule[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    out.push(computeDailyPrayerTimes(new Date(year, monthIndex0, day), lat, lng));
  }
  return out;
}

export function getNextPrayer(
  now: Date,
  lat: number,
  lng: number
): { name: PrayerName; time: Date; isTomorrow: boolean; diffMs: number } {
  const today = computeDailyPrayerTimes(now, lat, lng);
  const order: Array<[PrayerName, Date]> = [
    ['fajr', today.fajr],
    ['dhuhr', today.dhuhr],
    ['asr', today.asr],
    ['maghrib', today.maghrib],
    ['isha', today.isha],
  ];

  for (const [name, time] of order) {
    if (time.getTime() > now.getTime()) {
      return { name, time, isTomorrow: false, diffMs: time.getTime() - now.getTime() };
    }
  }

  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = computeDailyPrayerTimes(tomorrowDate, lat, lng);
  return {
    name: 'fajr',
    time: tomorrow.fajr,
    isTomorrow: true,
    diffMs: tomorrow.fajr.getTime() - now.getTime(),
  };
}

export function formatPrayerClock(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
