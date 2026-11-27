import { computed, signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import {
  AUDIO_CACHE_NAME,
  DEFAULT_RECITER_ID,
  getAyahAudioUrls,
  getReciter,
} from '@/data/reciters';
import { fetchSurahAyahs, type Ayah } from '@/lib/quran/api';
import { showToast } from './toast';

export type RepeatAyahOption = 1 | 2 | 3 | 5 | 0; // 0 = endless
export type GapOption = 0 | 2 | 5 | 'ayah';
export type PlaybackRate = 0.75 | 1 | 1.25 | 1.5;

export interface AudioPrefs {
  reciter: string;
  repeatAyah: RepeatAyahOption;
  gap: GapOption;
  rate: PlaybackRate;
  autoScroll: boolean;
}

export interface RangeRepeat {
  surahId: number;
  from: number;
  to: number;
  times: number; // 0 = endless
  done: number;
}

export type SleepTimer =
  | { kind: 'off' }
  | { kind: 'surah-end' }
  | { kind: 'deadline'; at: number };

const PREFS_KEY = 'tq:audio';
const DL_KEY = 'tq:audio:downloads';

export const PLAYBACK_RATES: readonly PlaybackRate[] = [0.75, 1, 1.25, 1.5];
export const REPEAT_OPTIONS: readonly RepeatAyahOption[] = [1, 2, 3, 5, 0];
export const GAP_OPTIONS: readonly GapOption[] = [0, 2, 5, 'ayah'];

export const audioPrefs = signal<AudioPrefs>({
  reciter: DEFAULT_RECITER_ID,
  repeatAyah: 1,
  gap: 0,
  rate: 1,
  autoScroll: true,
  ...readStorage<Partial<AudioPrefs>>(PREFS_KEY, {}),
});

export function scrollAyahIntoView(el: HTMLElement | null): void {
  if (!el || typeof window === 'undefined') return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const tall = el.offsetHeight > window.innerHeight * 0.55;
  el.scrollIntoView({
    behavior: reduced ? 'auto' : 'smooth',
    block: tall ? 'start' : 'center',
  });
}

export const currentAyah = signal<Ayah | null>(null);
export const currentSurahName = signal<string>('');
export const audioQueue = signal<Ayah[]>([]);
export const isPlaying = signal<boolean>(false);
export const isBuffering = signal<boolean>(false);
export const currentTime = signal<number>(0);
export const duration = signal<number>(0);
export const playsInAyah = signal<number>(0);
export const rangeRepeat = signal<RangeRepeat | null>(null);
export const sleepTimer = signal<SleepTimer>({ kind: 'off' });
export const downloadedSurahs = signal<Record<string, boolean>>(
  readStorage<Record<string, boolean>>(DL_KEY, {})
);
export const downloadJob = signal<{
  key: string;
  done: number;
  total: number;
  cancelled: boolean;
} | null>(null);

export const queueIndex = computed(() => {
  const cur = currentAyah.value;
  if (!cur) return -1;
  return audioQueue.value.findIndex((a) => a.i === cur.i);
});

export const progressPercent = computed(() =>
  duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0
);

let audioEl: HTMLAudioElement | null = null;
let fallbackUrls: string[] = [];
let fallbackIdx = 0;
let gapTimer: ReturnType<typeof setTimeout> | null = null;
let sleepTimeout: ReturnType<typeof setTimeout> | null = null;
const endedCallbacks = new Set<(ayah: Ayah) => void>();

export function onAyahAudioCompleted(cb: (ayah: Ayah) => void): () => void {
  endedCallbacks.add(cb);
  return () => endedCallbacks.delete(cb);
}

function clearGapTimer() {
  if (gapTimer) {
    clearTimeout(gapTimer);
    gapTimer = null;
  }
}

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
    audioEl.addEventListener('play', () => (isPlaying.value = true));
    audioEl.addEventListener('pause', () => (isPlaying.value = false));
    audioEl.addEventListener('waiting', () => (isBuffering.value = true));
    audioEl.addEventListener('playing', () => (isBuffering.value = false));
    audioEl.addEventListener('timeupdate', () => {
      currentTime.value = audioEl?.currentTime ?? 0;
    });
    audioEl.addEventListener('loadedmetadata', () => {
      duration.value = audioEl?.duration || 0;
    });
    audioEl.addEventListener('ended', handleEnded);
    audioEl.addEventListener('error', handleAudioError);
  }
  return audioEl;
}

function updateMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const cur = currentAyah.value;
  if (!cur) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    return;
  }
  const reciter = getReciter(audioPrefs.value.reciter);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${currentSurahName.value || `Surah ${cur.surahId}`} · Ayat ${cur.n}`,
      artist: reciter.name,
      album: "Al-Qur'an Digital — Teras Qur'an",
    });
    navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevAyah());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNextAyah());
  } catch {
    // Ignore MediaSession errors on older browsers
  }
}

function handleAudioError() {
  fallbackIdx += 1;
  if (fallbackIdx < fallbackUrls.length) {
    const el = getAudio();
    if (el) {
      el.src = fallbackUrls[fallbackIdx];
      el.playbackRate = audioPrefs.value.rate;
      el.play().catch(() => {});
    }
    return;
  }
  isBuffering.value = false;
  isPlaying.value = false;
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  showToast(
    offline
      ? 'Sedang offline. Audio surah ini belum diunduh — teks Al-Qur\'an tetap dapat dibaca offline.'
      : 'Audio ayat ini tidak dapat diputar.',
    { variant: 'error' }
  );
}

function computeGapMs(): number {
  const g = audioPrefs.value.gap;
  if (g === 'ayah') return Math.round((duration.value || 0) * 1000);
  return Math.max(0, g) * 1000;
}

function handleEnded() {
  const cur = currentAyah.value;
  if (!cur) return;

  if (playsInAyah.value === 0) {
    endedCallbacks.forEach((cb) => cb(cur));
  }

  // Check deadline sleep timer
  const st = sleepTimer.value;
  if (st.kind === 'deadline' && Date.now() >= st.at) {
    stopAudio();
    return;
  }

  const delayMs = computeGapMs();
  const rep = audioPrefs.value.repeatAyah;
  const nextPlayCount = playsInAyah.value + 1;

  if (rep === 0 || nextPlayCount < rep) {
    playsInAyah.value = nextPlayCount;
    scheduleRun(() => {
      const el = getAudio();
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    }, delayMs);
    return;
  }

  // Check range repeat
  const range = rangeRepeat.value;
  if (range && cur.surahId === range.surahId && cur.n === range.to) {
    const done = range.done + 1;
    if (range.times > 0 && done >= range.times) {
      rangeRepeat.value = null;
      stopAudio();
      return;
    }
    const startIdx = audioQueue.value.findIndex(
      (a) => a.surahId === range.surahId && a.n === range.from
    );
    if (startIdx >= 0) {
      rangeRepeat.value = { ...range, done };
      scheduleRun(() => loadAndPlay(audioQueue.value[startIdx]), delayMs);
      return;
    }
  }

  // Advance to next in queue
  const nextIdx = queueIndex.value + 1;
  const nextItem = audioQueue.value[nextIdx];
  if (!nextItem) {
    stopAudio();
    return;
  }

  if (st.kind === 'surah-end' && nextItem.surahId !== cur.surahId) {
    sleepTimer.value = { kind: 'off' };
    stopAudio();
    return;
  }

  scheduleRun(() => loadAndPlay(nextItem), delayMs);
}

function scheduleRun(fn: () => void, delayMs: number) {
  clearGapTimer();
  if (delayMs <= 0) {
    fn();
  } else {
    gapTimer = setTimeout(() => {
      gapTimer = null;
      fn();
    }, delayMs);
  }
}

function loadAndPlay(ayah: Ayah) {
  clearGapTimer();
  const el = getAudio();
  if (!el) return;

  currentAyah.value = ayah;
  playsInAyah.value = 0;
  currentTime.value = 0;
  duration.value = 0;

  const dlKey = `${audioPrefs.value.reciter}:${ayah.surahId}`;
  const mode = downloadedSurahs.value[dlKey] ? 'download' : 'stream';
  fallbackUrls = getAyahAudioUrls(audioPrefs.value.reciter, ayah.i, mode);
  fallbackIdx = 0;

  el.src = fallbackUrls[0];
  el.playbackRate = audioPrefs.value.rate;
  isBuffering.value = true;
  el.play()
    .then(() => {
      isBuffering.value = false;
      updateMediaSession();
    })
    .catch(() => {
      isBuffering.value = false;
    });
}

export function playAyah(ayah: Ayah, queue: Ayah[] = [ayah], surahName = ''): void {
  if (currentAyah.value?.i === ayah.i) {
    togglePlay();
    return;
  }
  audioQueue.value = queue;
  if (surahName) currentSurahName.value = surahName;
  if (rangeRepeat.value && rangeRepeat.value.surahId !== ayah.surahId) {
    rangeRepeat.value = null;
  }
  loadAndPlay(ayah);
}

export function togglePlay(): void {
  const el = getAudio();
  if (!el || !currentAyah.value) return;
  clearGapTimer();
  if (el.paused) {
    el.play().catch(() => {});
  } else {
    el.pause();
  }
  updateMediaSession();
}

export function playNextAyah(): void {
  const next = audioQueue.value[queueIndex.value + 1];
  if (next) loadAndPlay(next);
}

export function playPrevAyah(): void {
  const prev = audioQueue.value[queueIndex.value - 1];
  if (prev) loadAndPlay(prev);
}

export function seekPercent(pct: number): void {
  const el = getAudio();
  if (el && duration.value > 0) {
    el.currentTime = (Math.min(100, Math.max(0, pct)) / 100) * duration.value;
    currentTime.value = el.currentTime;
  }
}

export function stopAudio(): void {
  clearGapTimer();
  const el = getAudio();
  if (el) {
    el.pause();
    el.removeAttribute('src');
    el.load();
  }
  currentAyah.value = null;
  isPlaying.value = false;
  isBuffering.value = false;
  currentTime.value = 0;
  duration.value = 0;
  rangeRepeat.value = null;
  updateMediaSession();
}

export function updateAudioPrefs(patch: Partial<AudioPrefs>): void {
  const prevReciter = audioPrefs.value.reciter;
  const next = { ...audioPrefs.value, ...patch };
  audioPrefs.value = next;
  writeStorage(PREFS_KEY, next);

  const el = getAudio();
  if (el && patch.rate) {
    el.playbackRate = patch.rate;
  }
  if (patch.reciter && patch.reciter !== prevReciter && currentAyah.value) {
    loadAndPlay(currentAyah.value);
  }
}

export function setSleepTimer(option: 'off' | 'surah-end' | number): void {
  if (sleepTimeout) {
    clearTimeout(sleepTimeout);
    sleepTimeout = null;
  }
  if (option === 'off') {
    sleepTimer.value = { kind: 'off' };
    return;
  }
  if (option === 'surah-end') {
    sleepTimer.value = { kind: 'surah-end' };
    return;
  }
  const at = Date.now() + option * 60 * 1000;
  sleepTimer.value = { kind: 'deadline', at };
  sleepTimeout = setTimeout(() => {
    sleepTimer.value = { kind: 'off' };
    stopAudio();
  }, option * 60 * 1000);
}

export async function startRangeRepeat(surahId: number, from: number, to: number, times: number): Promise<void> {
  const ayahs = await fetchSurahAyahs(surahId);
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const slice = ayahs.filter((a) => a.n >= start && a.n <= end);
  if (!slice.length) return;
  audioQueue.value = slice;
  rangeRepeat.value = { surahId, from: start, to: end, times: Math.max(0, times), done: 0 };
  loadAndPlay(slice[0]);
}

export function isSurahAudioDownloaded(reciterId: string, surahId: number): boolean {
  return Boolean(downloadedSurahs.value[`${reciterId}:${surahId}`]);
}

export async function downloadSurahAudio(reciterId: string, surahId: number, surahName: string): Promise<void> {
  if (typeof caches === 'undefined') {
    showToast('Browser ini tidak mendukung unduhan audio offline.', { variant: 'error' });
    return;
  }
  const key = `${reciterId}:${surahId}`;
  const ayahs = await fetchSurahAyahs(surahId);
  const cache = await caches.open(AUDIO_CACHE_NAME);
  downloadJob.value = { key, done: 0, total: ayahs.length, cancelled: false };

  try {
    for (let i = 0; i < ayahs.length; i++) {
      if (downloadJob.value?.cancelled) {
        downloadJob.value = null;
        showToast('Unduhan dibatalkan.');
        return;
      }
      const urls = getAyahAudioUrls(reciterId, ayahs[i].i, 'download');
      const res = await fetch(urls[0]);
      if (!res.ok) throw new Error('download-failed');
      await cache.put(urls[0], res);
      downloadJob.value = { key, done: i + 1, total: ayahs.length, cancelled: false };
    }
    const next = { ...downloadedSurahs.value, [key]: true };
    downloadedSurahs.value = next;
    writeStorage(DL_KEY, next);
    downloadJob.value = null;
    showToast(`${surahName} tersimpan untuk didengar offline.`, { variant: 'success' });
  } catch {
    downloadJob.value = null;
    showToast('Unduhan audio gagal. Periksa koneksi lalu coba lagi.', { variant: 'error' });
  }
}

export function cancelSurahDownload(): void {
  if (downloadJob.value) {
    downloadJob.value = { ...downloadJob.value, cancelled: true };
  }
}

export async function removeSurahAudioDownload(reciterId: string, surahId: number): Promise<void> {
  const key = `${reciterId}:${surahId}`;
  if (typeof caches !== 'undefined') {
    const ayahs = await fetchSurahAyahs(surahId);
    const cache = await caches.open(AUDIO_CACHE_NAME);
    for (const a of ayahs) {
      const urls = getAyahAudioUrls(reciterId, a.i, 'download');
      await cache.delete(urls[0]).catch(() => {});
    }
  }
  const { [key]: _removed, ...rest } = downloadedSurahs.value;
  downloadedSurahs.value = rest;
  writeStorage(DL_KEY, rest);
  showToast('Unduhan audio dihapus.');
}

export async function removeAllAudioDownloads(): Promise<void> {
  if (typeof caches !== 'undefined') {
    await caches.delete(AUDIO_CACHE_NAME).catch(() => {});
  }
  downloadedSurahs.value = {};
  writeStorage(DL_KEY, {});
  showToast('Semua unduhan audio dihapus.');
}
