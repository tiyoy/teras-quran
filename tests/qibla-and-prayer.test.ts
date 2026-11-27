import { describe, it, expect } from 'vitest';
import { computeQiblaBearing, computeKaabaDistanceKm, shortestAngleDelta } from '@/lib/worship/qibla';
import { computeDailyPrayerTimes, computeMonthlyPrayerTimes } from '@/lib/worship/prayer-times';
import { formatHijriDate } from '@/lib/worship/hijri';

describe('qibla & prayer-times', () => {
  it('computes accurate Qibla bearing and distance for Jakarta', () => {
    // Jakarta: -6.2088, 106.8456 -> ~295.15 deg, ~7920 km
    const bearing = computeQiblaBearing(-6.2088, 106.8456);
    expect(bearing).toBeGreaterThan(294.5);
    expect(bearing).toBeLessThan(295.8);

    const dist = computeKaabaDistanceKm(-6.2088, 106.8456);
    expect(dist).toBeGreaterThan(7850);
    expect(dist).toBeLessThan(8000);

    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
  });

  it('computes Kemenag RI prayer times in strictly chronological order with imsak 10m before fajr', () => {
    const date = new Date(2026, 10, 27); // 27 Nov 2026
    const times = computeDailyPrayerTimes(date, -6.2088, 106.8456);

    expect(times.fajr.getTime() - times.imsak.getTime()).toBe(10 * 60 * 1000);
    expect(times.imsak.getTime()).toBeLessThan(times.fajr.getTime());
    expect(times.fajr.getTime()).toBeLessThan(times.sunrise.getTime());
    expect(times.sunrise.getTime()).toBeLessThan(times.dhuhr.getTime());
    expect(times.dhuhr.getTime()).toBeLessThan(times.asr.getTime());
    expect(times.asr.getTime()).toBeLessThan(times.maghrib.getTime());
    expect(times.maghrib.getTime()).toBeLessThan(times.isha.getTime());

    const month = computeMonthlyPrayerTimes(2026, 10, -6.2088, 106.8456);
    expect(month).toHaveLength(30); // November has 30 days
  });

  it('formats Hijri date string with optional offset days', () => {
    const d0 = formatHijriDate(new Date(2026, 10, 27), 0, 'id');
    const d1 = formatHijriDate(new Date(2026, 10, 27), 1, 'id');
    expect(d0.length).toBeGreaterThan(5);
    expect(d0).not.toBe(d1);
  });
});
