export interface Reciter {
  id: string;
  name: string;
  style: 'murattal' | 'mujawwad';
  streamBitrate: 64 | 128;
  downloadBitrate: 64 | 128;
  pace: number;
}

export const AUDIO_CDN_BASE = 'https://cdn.islamic.network';
export const AUDIO_CACHE_NAME = 'tq-audio-v1';
export const DEFAULT_RECITER_ID = 'ar.alafasy';

export const RECITERS: readonly Reciter[] = [
  {
    id: 'ar.alafasy',
    name: 'Mishary Rashid Alafasy',
    style: 'murattal',
    streamBitrate: 128,
    downloadBitrate: 64,
    pace: 1,
  },
  {
    id: 'ar.abdulbasitmurattal',
    name: 'Abdul Basit Abdus Samad',
    style: 'murattal',
    streamBitrate: 64,
    downloadBitrate: 64,
    pace: 1.14,
  },
  {
    id: 'ar.husary',
    name: 'Mahmoud Khalil Al-Husary',
    style: 'murattal',
    streamBitrate: 128,
    downloadBitrate: 64,
    pace: 1.51,
  },
  {
    id: 'ar.husarymujawwad',
    name: 'Mahmoud Khalil Al-Husary',
    style: 'mujawwad',
    streamBitrate: 128,
    downloadBitrate: 64,
    pace: 2.22,
  },
  {
    id: 'ar.minshawi',
    name: 'Mohamed Siddiq Al-Minshawi',
    style: 'murattal',
    streamBitrate: 128,
    downloadBitrate: 128,
    pace: 1.04,
  },
  {
    id: 'ar.minshawimujawwad',
    name: 'Mohamed Siddiq Al-Minshawi',
    style: 'mujawwad',
    streamBitrate: 64,
    downloadBitrate: 64,
    pace: 2.09,
  },
  {
    id: 'ar.abdurrahmaansudais',
    name: 'Abdurrahman As-Sudais',
    style: 'murattal',
    streamBitrate: 64,
    downloadBitrate: 64,
    pace: 0.75,
  },
  {
    id: 'ar.mahermuaiqly',
    name: 'Maher Al-Muaiqly',
    style: 'murattal',
    streamBitrate: 128,
    downloadBitrate: 64,
    pace: 0.77,
  },
];

// Approximate KB per surah at 64kbps pace=1
const SURAH_BASE_KB = [
  407, 61108, 35310, 37925, 28208, 30059, 34217, 12766, 25894, 18050, 18767, 17463, 8371, 8449,
  7649, 18834, 15985, 15752, 9941, 13632, 12656, 12653, 11393, 13422, 9499, 15434, 11716, 14121,
  10377, 8416, 5234, 3845, 13595, 8598, 7729, 7840, 11053, 7940, 11674, 12304, 8085, 8464, 9100,
  4084, 5071, 6293, 5812, 5890, 3627, 3943, 4237, 3605, 4029, 3993, 4701, 5194, 5971, 4802, 4649,
  3602, 2326, 1855, 1935, 2672, 2826, 2596, 3379, 3564, 3226, 2766, 2512, 2827, 2181, 3087, 2071,
  2824, 2569, 2330, 2391, 1835, 1394, 1031, 2173, 1358, 1367, 832, 953, 1237, 1730, 1063, 800,
  1018, 554, 375, 503, 936, 359, 1026, 495, 564, 543, 420, 240, 460, 320, 263, 386, 176, 340, 257,
  286, 199, 269, 299,
];

export function getReciter(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

export function getAyahAudioUrls(reciterId: string, globalAyahId: number, mode: 'stream' | 'download' = 'stream'): string[] {
  const reciter = getReciter(reciterId);
  const ayah = Math.trunc(globalAyahId);
  const bitrate = mode === 'stream' ? reciter.streamBitrate : reciter.downloadBitrate;
  const primary = `${AUDIO_CDN_BASE}/quran/audio/${bitrate}/${reciter.id}/${ayah}.mp3`;
  const fallback64 = `${AUDIO_CDN_BASE}/quran/audio/64/${reciter.id}/${ayah}.mp3`;
  const alafasyFallback = `${AUDIO_CDN_BASE}/quran/audio/128/ar.alafasy/${ayah}.mp3`;
  return [...new Set([primary, fallback64, alafasyFallback])];
}

export function estimateSurahAudioBytes(reciterId: string, surahId: number): number {
  const reciter = getReciter(reciterId);
  const baseKb = SURAH_BASE_KB[surahId - 1];
  if (!baseKb) return 0;
  return Math.round(baseKb * 1024 * reciter.pace * (reciter.downloadBitrate / 64));
}
