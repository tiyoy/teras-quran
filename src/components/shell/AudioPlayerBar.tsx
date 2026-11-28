import { useState } from 'preact/hooks';
import {
  CheckCircle2,
  Download,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-preact';
import {
  audioPrefs,
  cancelSurahDownload,
  currentAyah,
  currentSurahName,
  currentTime,
  downloadJob,
  downloadSurahAudio,
  duration,
  GAP_OPTIONS,
  isBuffering,
  isPlaying,
  isSurahAudioDownloaded,
  PLAYBACK_RATES,
  playNextAyah,
  playPrevAyah,
  playsInAyah,
  progressPercent,
  rangeRepeat,
  removeSurahAudioDownload,
  REPEAT_OPTIONS,
  seekPercent,
  setSleepTimer,
  sleepTimer,
  startRangeRepeat,
  stopAudio,
  togglePlay,
  updateAudioPrefs,
} from '@/stores/audio-player';
import { estimateSurahAudioBytes, getReciter, RECITERS } from '@/data/reciters';
import { getSurahAyahCount } from '@/lib/quran/meta';
import { Button, Modal, Switch } from '@/components/ui/Primitives';

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioPlayerBar() {
  const cur = currentAyah.value;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(5);
  const [rangeTimes, setRangeTimes] = useState(3);

  if (!cur) return null;

  const reciter = getReciter(audioPrefs.value.reciter);
  const maxAyah = getSurahAyahCount(cur.surahId);
  const dlKey = `${reciter.id}:${cur.surahId}`;
  const isDl = isSurahAudioDownloaded(reciter.id, cur.surahId);
  const activeJob = downloadJob.value?.key === dlKey ? downloadJob.value : null;
  const estSize = formatBytes(estimateSurahAudioBytes(reciter.id, cur.surahId));

  return (
    <>
      <div
        class="fixed inset-x-0 bottom-14 z-30 border-t border-[var(--border)] bg-[var(--card)] lg:bottom-0 lg:left-64"
        role="region"
        aria-label="Pemutar audio murottal"
      >
        {/* Flat progress bar */}
        <div
          class="h-1 w-full cursor-pointer bg-[var(--muted)]"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekPercent(((e.clientX - rect.left) / rect.width) * 100);
          }}
        >
          <div
            class="h-full bg-[var(--primary)] transition-all duration-100"
            style={{ width: `${progressPercent.value}%` }}
          />
        </div>

        <div class="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-[var(--foreground)]">
              {currentSurahName.value || `Surah ${cur.surahId}`} · Ayat {cur.n}
              {audioPrefs.value.repeatAyah !== 1 && (
                <span class="ml-2 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-foreground)] tabular-nums">
                  {playsInAyah.value + 1}/{audioPrefs.value.repeatAyah || '∞'}
                </span>
              )}
              {rangeRepeat.value && (
                <span class="ml-1.5 rounded bg-[var(--gold-surface)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--gold-ink)] tabular-nums">
                  Ayat {rangeRepeat.value.from}–{rangeRepeat.value.to}
                </span>
              )}
            </p>
            <p class="truncate text-xs text-[var(--muted-foreground)] tabular-nums">
              {reciter.name} · {formatClock(currentTime.value)} / {formatClock(duration.value)}
            </p>
          </div>

          <div class="flex items-center gap-1">
            <button
              type="button"
              onClick={playPrevAyah}
              aria-label="Ayat sebelumnya"
              class="inline-flex size-8 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer"
            >
              <SkipBack class="size-4" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying.value ? 'Jeda' : 'Putar'}
              class="inline-flex size-9 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] cursor-pointer"
            >
              {isBuffering.value ? (
                <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isPlaying.value ? (
                <Pause class="size-4" />
              ) : (
                <Play class="size-4 translate-x-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={playNextAyah}
              aria-label="Ayat berikutnya"
              class="inline-flex size-8 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer"
            >
              <SkipForward class="size-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setRangeFrom(cur.n);
                setRangeTo(Math.min(maxAyah, cur.n + 4));
                setOptionsOpen(true);
              }}
              aria-label="Opsi audio"
              title="Opsi audio"
              class="ml-1 inline-flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer"
            >
              <SlidersHorizontal class="size-4" />
            </button>
            <button
              type="button"
              onClick={stopAudio}
              aria-label="Tutup pemutar"
              class="inline-flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X class="size-4" />
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        title="Pengaturan audio"
        description="Qari, kecepatan, pengulangan, jeda, timer tidur, dan unduhan offline."
      >
        <div class="space-y-5 text-sm">
          {/* Auto-scroll follow reciter */}
          <div class="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] p-3.5">
            <div>
              <p class="font-medium">Ikuti ayat (Auto-scroll)</p>
              <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Gulir halaman otomatis mengikuti ayat yang sedang dibacakan qari.
              </p>
            </div>
            <Switch
              checked={audioPrefs.value.autoScroll}
              onChange={(v) => updateAudioPrefs({ autoScroll: v })}
              label="Ikuti ayat otomatis saat audio diputar"
            />
          </div>

          {/* Reciter */}
          <div>
            <p class="mb-2 font-medium">Qari</p>
            <div class="grid gap-1.5">
              {RECITERS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => updateAudioPrefs({ reciter: r.id })}
                  class={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                    audioPrefs.value.reciter === r.id
                      ? 'border-[var(--primary)] bg-[var(--accent)] text-[var(--accent-foreground)] font-medium'
                      : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <span>{r.name}</span>
                  <span class="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[11px] capitalize text-[var(--muted-foreground)]">
                    {r.style}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Playback Rate */}
          <div>
            <p class="mb-2 font-medium">Kecepatan putar</p>
            <div class="flex flex-wrap gap-1.5">
              {PLAYBACK_RATES.map((rate) => (
                <Button
                  key={rate}
                  size="sm"
                  variant={audioPrefs.value.rate === rate ? 'primary' : 'outline'}
                  onClick={() => updateAudioPrefs({ rate })}
                >
                  {rate}×
                </Button>
              ))}
            </div>
          </div>

          {/* Repeat per ayah */}
          <div>
            <p class="mb-2 font-medium">Ulangi ayat</p>
            <div class="flex flex-wrap gap-1.5">
              {REPEAT_OPTIONS.map((rep) => (
                <Button
                  key={rep}
                  size="sm"
                  variant={audioPrefs.value.repeatAyah === rep ? 'primary' : 'outline'}
                  onClick={() => updateAudioPrefs({ repeatAyah: rep })}
                >
                  {rep === 0 ? 'Tanpa batas' : `${rep}×`}
                </Button>
              ))}
            </div>
          </div>

          {/* Gap between ayahs */}
          <div>
            <p class="mb-2 font-medium">Jeda antar ayat</p>
            <div class="flex flex-wrap gap-1.5">
              {GAP_OPTIONS.map((gap) => (
                <Button
                  key={String(gap)}
                  size="sm"
                  variant={audioPrefs.value.gap === gap ? 'primary' : 'outline'}
                  onClick={() => updateAudioPrefs({ gap })}
                >
                  {gap === 0 ? 'Tanpa' : gap === 'ayah' ? 'Sepanjang ayat' : `${gap} dtk`}
                </Button>
              ))}
            </div>
          </div>

          {/* Range Repeat */}
          <div class="rounded-xl border border-[var(--border)] p-3.5">
            <div class="mb-2 flex items-center justify-between">
              <p class="flex items-center gap-1.5 font-medium">
                <Repeat class="size-4 text-[var(--primary)]" />
                Ulangi rentang ayat
              </p>
              {rangeRepeat.value && (
                <Button size="sm" variant="destructive" onClick={() => (rangeRepeat.value = null)}>
                  Hentikan
                </Button>
              )}
            </div>
            <div class="grid grid-cols-3 gap-2">
              <label class="text-xs text-[var(--muted-foreground)]">
                Dari
                <input
                  type="number"
                  min={1}
                  max={maxAyah}
                  value={rangeFrom}
                  onInput={(e) => setRangeFrom(Number((e.target as HTMLInputElement).value))}
                  class="mt-1 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] tabular-nums"
                />
              </label>
              <label class="text-xs text-[var(--muted-foreground)]">
                Sampai
                <input
                  type="number"
                  min={1}
                  max={maxAyah}
                  value={rangeTo}
                  onInput={(e) => setRangeTo(Number((e.target as HTMLInputElement).value))}
                  class="mt-1 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] tabular-nums"
                />
              </label>
              <label class="text-xs text-[var(--muted-foreground)]">
                Putaran (0=∞)
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={rangeTimes}
                  onInput={(e) => setRangeTimes(Number((e.target as HTMLInputElement).value))}
                  class="mt-1 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] tabular-nums"
                />
              </label>
            </div>
            <Button
              size="sm"
              class="mt-2.5 w-full"
              onClick={() => {
                startRangeRepeat(cur.surahId, rangeFrom, rangeTo, rangeTimes);
                setOptionsOpen(false);
              }}
            >
              Mulai ulangi rentang
            </Button>
          </div>

          {/* Sleep Timer */}
          <div>
            <p class="mb-2 font-medium">Timer tidur</p>
            <div class="flex flex-wrap gap-1.5">
              {(['off', 15, 30, 60, 'surah-end'] as const).map((opt) => {
                const active =
                  (opt === 'off' && sleepTimer.value.kind === 'off') ||
                  (opt === 'surah-end' && sleepTimer.value.kind === 'surah-end');
                return (
                  <Button
                    key={String(opt)}
                    size="sm"
                    variant={active ? 'primary' : 'outline'}
                    onClick={() => setSleepTimer(opt)}
                  >
                    {opt === 'off' ? 'Mati' : opt === 'surah-end' ? 'Akhir surah' : `${opt} mnt`}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Offline download for current surah */}
          <div class="rounded-xl border border-[var(--border)] p-3.5">
            <p class="mb-2 font-medium">Unduh surah ini ({currentSurahName.value || `Surah ${cur.surahId}`})</p>
            {activeJob ? (
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs tabular-nums">
                  <span>
                    Mengunduh {activeJob.done} dari {activeJob.total} ayat
                  </span>
                  <Button size="sm" variant="ghost" onClick={cancelSurahDownload}>
                    Batal
                  </Button>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    class="h-full bg-[var(--primary)]"
                    style={{ width: `${(activeJob.done / Math.max(1, activeJob.total)) * 100}%` }}
                  />
                </div>
              </div>
            ) : isDl ? (
              <div class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-1.5 text-xs text-[var(--primary)]">
                  <CheckCircle2 class="size-4" />
                  Tersimpan untuk didengar offline
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeSurahAudioDownload(reciter.id, cur.surahId)}
                >
                  <Trash2 class="size-3.5" />
                  Hapus
                </Button>
              </div>
            ) : (
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs text-[var(--muted-foreground)]">Sekitar {estSize}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadSurahAudio(reciter.id, cur.surahId, currentSurahName.value || `Surah ${cur.surahId}`)
                  }
                >
                  <Download class="size-3.5" />
                  Unduh surah ini
                </Button>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
