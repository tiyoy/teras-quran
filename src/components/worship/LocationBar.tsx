import { useEffect, useMemo, useState } from 'preact/hooks';
import { LocateFixed, MapPin, Search } from 'lucide-preact';
import { DEFAULT_CITY, INDONESIAN_CITIES } from '@/data/cities-id';
import { setCityLocation, setGpsLocation, userLocation, type SavedLocation } from '@/stores/location';
import { showToast } from '@/stores/toast';
import { Button, Card, Modal } from '@/components/ui/Primitives';

const SSR_LOCATION: SavedLocation = {
  name: DEFAULT_CITY.name,
  province: DEFAULT_CITY.province,
  lat: DEFAULT_CITY.lat,
  lng: DEFAULT_CITY.lng,
  timezone: DEFAULT_CITY.timezone,
  source: 'city',
  hijriOffset: 0,
};

export function LocationBar() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [locating, setLocating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loc = mounted ? userLocation.value : SSR_LOCATION;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INDONESIAN_CITIES;
    return INDONESIAN_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q)
    );
  }, [search]);

  function useGps() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('Browser ini tidak mendukung GPS. Pilih kota secara manual.', { variant: 'error' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        showToast('Lokasi diperbarui dari GPS.', { variant: 'success' });
      },
      () => {
        setLocating(false);
        showToast('Izin lokasi ditolak atau gagal. Pilih kota secara manual.', { variant: 'error' });
      },
      { timeout: 10_000 }
    );
  }

  return (
    <>
      <Card class="flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">
            <MapPin class="size-4" />
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--foreground)]">
              {loc.name}
              {loc.province ? `, ${loc.province}` : ''}
            </p>
            <p class="text-[11px] text-[var(--muted-foreground)] tabular-nums">
              {loc.lat.toFixed(4)}°, {loc.lng.toFixed(4)}° · Disimpan di perangkat ini saja
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={locating} onClick={useGps}>
            <LocateFixed class="size-3.5" />
            {locating ? 'Mencari…' : 'Gunakan GPS'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
            Pilih kota
          </Button>
        </div>
      </Card>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pilih lokasi"
        description="Cari kota atau kabupaten di Indonesia."
      >
        <div class="space-y-3">
          <div class="relative">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              id="location-city-search"
              name="citySearch"
              type="text"
              aria-label="Cari kota atau provinsi"
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              placeholder="Cari nama kota atau provinsi…"
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] pl-9 pr-3 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div class="max-h-72 space-y-1 overflow-y-auto">
            {filtered.map((city) => (
              <button
                key={`${city.name}-${city.province}`}
                type="button"
                onClick={() => {
                  setCityLocation(city);
                  setPickerOpen(false);
                  showToast(`Lokasi diatur ke ${city.name}.`, { variant: 'success' });
                }}
                class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--muted)] cursor-pointer"
              >
                <span class="font-medium text-[var(--foreground)]">{city.name}</span>
                <span class="text-xs text-[var(--muted-foreground)]">{city.province}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p class="py-6 text-center text-xs text-[var(--muted-foreground)]">
                Tidak ada kota yang cocok.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
