import { signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import { DEFAULT_CITY, type CityOption } from '@/data/cities-id';

export interface SavedLocation {
  name: string;
  province?: string;
  lat: number;
  lng: number;
  timezone: string;
  source: 'city' | 'gps';
  hijriOffset: number;
}

const KEY = 'tq:location';

const DEFAULT_LOCATION: SavedLocation = {
  name: DEFAULT_CITY.name,
  province: DEFAULT_CITY.province,
  lat: DEFAULT_CITY.lat,
  lng: DEFAULT_CITY.lng,
  timezone: DEFAULT_CITY.timezone,
  source: 'city',
  hijriOffset: 0,
};

export const userLocation = signal<SavedLocation>({
  ...DEFAULT_LOCATION,
  ...readStorage<Partial<SavedLocation>>(KEY, {}),
});

export function setCityLocation(city: CityOption): void {
  const next: SavedLocation = {
    name: city.name,
    province: city.province,
    lat: city.lat,
    lng: city.lng,
    timezone: city.timezone,
    source: 'city',
    hijriOffset: userLocation.value.hijriOffset,
  };
  userLocation.value = next;
  writeStorage(KEY, next);
}

export function setGpsLocation(lat: number, lng: number): void {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const next: SavedLocation = {
    name: 'Lokasi saya (GPS)',
    lat,
    lng,
    timezone: tz,
    source: 'gps',
    hijriOffset: userLocation.value.hijriOffset,
  };
  userLocation.value = next;
  writeStorage(KEY, next);
}

export function setHijriOffset(offset: number): void {
  const clamped = Math.max(-2, Math.min(2, Math.trunc(offset)));
  const next = { ...userLocation.value, hijriOffset: clamped };
  userLocation.value = next;
  writeStorage(KEY, next);
}
