import { useEffect, useState } from 'preact/hooks';
import { Compass, Info } from 'lucide-preact';
import {
  computeKaabaDistanceKm,
  computeQiblaBearing,
  extractCompassHeading,
  shortestAngleDelta,
} from '@/lib/worship/qibla';
import { userLocation } from '@/stores/location';
import { Badge, Button, Card, PageHeader } from '@/components/ui/Primitives';
import { LocationBar } from './LocationBar';

export function QiblaView() {
  const loc = userLocation.value;
  const bearing = computeQiblaBearing(loc.lat, loc.lng);
  const distanceKm = Math.round(computeKaabaDistanceKm(loc.lat, loc.lng));

  const [heading, setHeading] = useState<number | null>(null);
  const [sensorStatus, setSensorStatus] = useState<'idle' | 'active' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (sensorStatus !== 'active') return;
    const onOrient = (ev: Event) => {
      const h = extractCompassHeading(ev as DeviceOrientationEvent & { webkitCompassHeading?: number });
      if (h !== null) setHeading(h);
    };
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient, true);
      window.removeEventListener('deviceorientation', onOrient, true);
    };
  }, [sensorStatus]);

  async function enableCompass() {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSensorStatus('unsupported');
      return;
    }
    const DevOrient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DevOrient.requestPermission === 'function') {
      try {
        const perm = await DevOrient.requestPermission();
        setSensorStatus(perm === 'granted' ? 'active' : 'denied');
      } catch {
        setSensorStatus('denied');
      }
    } else {
      setSensorStatus('active');
    }
  }

  const delta = heading !== null ? shortestAngleDelta(heading, bearing) : null;
  const facingQibla = delta !== null && Math.abs(delta) <= 5;
  const dialRotation = heading !== null ? -heading : 0;

  return (
    <div class="space-y-5">
      <PageHeader
        title="Kiblat"
        description="Arah Ka'bah dihitung secara lokal dari koordinat lokasimu."
      />

      <LocationBar />

      <div class="grid gap-4 lg:grid-cols-12">
        {/* Flat Geometric SVG Compass Dial */}
        <Card class="flex flex-col items-center justify-center p-6 lg:col-span-7">
          <div class="relative flex size-64 items-center justify-center sm:size-72">
            {/* Fixed top alignment marker */}
            <div class="absolute top-0 left-1/2 z-10 h-4 w-1 -translate-x-1/2 rounded-full bg-[var(--primary)]" />

            <svg
              viewBox="0 0 240 240"
              class="size-full transition-transform duration-150"
              style={{ transform: `rotate(${dialRotation}deg)` }}
              aria-label={`Kompas: kiblat ${Math.round(bearing)} derajat dari utara`}
            >
              {/* Outer circle */}
              <circle
                cx="120"
                cy="120"
                r="108"
                fill="var(--background)"
                stroke={facingQibla ? 'var(--primary)' : 'var(--border)'}
                stroke-width={facingQibla ? '3' : '2'}
              />
              <circle
                cx="120"
                cy="120"
                r="82"
                fill="none"
                stroke="var(--border)"
                stroke-width="1"
                stroke-dasharray="3 4"
              />

              {/* Cardinal directions */}
              <text x="120" y="31" text-anchor="middle" fill="var(--destructive)" font-size="14" font-weight="700">
                U
              </text>
              <text x="210" y="125" text-anchor="middle" fill="var(--muted-foreground)" font-size="12" font-weight="600">
                T
              </text>
              <text x="120" y="218" text-anchor="middle" fill="var(--muted-foreground)" font-size="12" font-weight="600">
                S
              </text>
              <text x="30" y="125" text-anchor="middle" fill="var(--muted-foreground)" font-size="12" font-weight="600">
                B
              </text>

              {/* Qibla Bearing Pointer */}
              <g transform={`rotate(${bearing} 120 120)`}>
                <line
                  x1="120"
                  y1="120"
                  x2="120"
                  y2="40"
                  stroke="var(--primary)"
                  stroke-width="3.5"
                  stroke-linecap="round"
                />
                {/* Kaaba geometric cube indicator */}
                <rect
                  x="110"
                  y="32"
                  width="20"
                  height="20"
                  rx="3"
                  fill="var(--primary)"
                  stroke="var(--gold)"
                  stroke-width="2"
                />
                <line x1="112" y1="39" x2="128" y2="39" stroke="var(--gold)" stroke-width="2" />
              </g>

              {/* Center hub */}
              <circle cx="120" cy="120" r="7" fill="var(--primary)" />
              <circle cx="120" cy="120" r="3" fill="var(--primary-foreground)" />
            </svg>
          </div>

          <div class="mt-5 text-center">
            {sensorStatus === 'idle' && (
              <Button size="sm" onClick={enableCompass}>
                <Compass class="size-4" />
                Aktifkan kompas perangkat
              </Button>
            )}
            {sensorStatus === 'active' && heading === null && (
              <p class="text-xs text-[var(--muted-foreground)]">
                Menunggu sensor kompas… (kompas langsung hanya aktif di perangkat dengan magnetometer).
              </p>
            )}
            {sensorStatus === 'active' && delta !== null && (
              <div class="space-y-1">
                <Badge variant={facingQibla ? 'success' : 'primary'}>
                  {facingQibla
                    ? 'Kamu menghadap kiblat'
                    : delta > 0
                      ? `Putar ke kanan ${Math.round(delta)}°`
                      : `Putar ke kiri ${Math.round(Math.abs(delta))}°`}
                </Badge>
                <p class="text-xs text-[var(--muted-foreground)] tabular-nums">
                  Ponsel menghadap {Math.round(heading!)}°
                </p>
              </div>
            )}
            {sensorStatus === 'denied' && (
              <p class="text-xs text-[var(--destructive)]">
                Izin sensor gerak ditolak. Gunakan sudut derajat di samping dengan kompas biasa.
              </p>
            )}
            {sensorStatus === 'unsupported' && (
              <p class="text-xs text-[var(--muted-foreground)]">
                Kompas tidak tersedia di perangkat ini. Gunakan sudut derajat di samping dengan kompas biasa.
              </p>
            )}
          </div>
        </Card>

        {/* Numeric Bearing & Info */}
        <div class="space-y-4 lg:col-span-5">
          <Card class="p-5">
            <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              Arah kiblat
            </p>
            <p class="mt-2 text-4xl font-bold tracking-tight tabular-nums text-[var(--foreground)]">
              {bearing.toFixed(1)}°
            </p>
            <p class="mt-1 text-xs text-[var(--muted-foreground)]">
              dari utara sejati, searah jarum jam
            </p>
            <div class="mt-4 border-t border-[var(--border)] pt-3 text-sm">
              <span class="text-[var(--muted-foreground)]">Jarak ke Ka&apos;bah: </span>
              <strong class="tabular-nums">{distanceKm.toLocaleString('id-ID')} km</strong>
            </div>
          </Card>

          <Card class="space-y-2.5 p-5 text-xs leading-relaxed text-[var(--muted-foreground)]">
            <p class="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
              <Info class="size-4 text-[var(--primary)]" />
              Tips akurasi kompas
            </p>
            <p>
              • Jika arah terasa meleset, kalibrasi kompas dengan menggerakkan ponsel membentuk angka 8.
            </p>
            <p>
              • Jauhkan ponsel dari benda logam, magnet, atau casing bermagnet saat menggunakan kompas.
            </p>
            <p>
              • Derajat dihitung dari utara sejati menggunakan rumus lingkaran besar (great-circle) ke Ka&apos;bah (21,4225° LU, 39,8262° BT).
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
