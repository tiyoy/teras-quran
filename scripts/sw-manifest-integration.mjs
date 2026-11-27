import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELL_PAGES = [
  '/',
  '/panduan',
  '/tentang',
  '/privacy-policy',
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/verifikasi',
  '/app',
  '/app/surah',
  '/app/juz',
  '/app/halaman',
  '/app/manzil',
  '/app/ruku',
  '/app/sajda',
  '/app/tajwid',
  '/app/cari',
  '/app/bacaanku',
  '/app/favorit',
  '/app/koleksi',
  '/app/catatan',
  '/app/surah-pilihan',
  '/app/progres',
  '/app/hafalan',
  '/app/sambung-ayat',
  '/app/khataman',
  '/app/khataman/grup',
  '/app/sholat',
  '/app/kiblat',
  '/app/tasbih',
  '/app/asmaul-husna',
  '/app/notifikasi',
  '/app/pengaturan',
  // Dynamic reader templates reused offline for /app/baca/1..114 and /app/halaman/1..604
  '/app/baca/1',
  '/app/halaman/1',
];

async function listFilesRelative(baseDir, subDir) {
  const full = path.join(baseDir, subDir);
  try {
    const entries = await fs.readdir(full, { withFileTypes: true });
    const out = [];
    for (const e of entries) {
      const rel = `${subDir}/${e.name}`;
      if (e.isDirectory()) {
        out.push(...(await listFilesRelative(baseDir, rel)));
      } else {
        out.push(`/${rel.replace(/\\/g, '/')}`);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Generates `dist/sw-manifest.json` after every `astro build` so the Service Worker
 * automatically caches every hashed JS/CSS bundle, font, icon, menu route, and all 114 surahs.
 */
export function swManifestIntegration() {
  return {
    name: 'tq-sw-manifest',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const [astroAssets, fontAssets, iconAssets] = await Promise.all([
          listFilesRelative(outDir, '_astro'),
          listFilesRelative(outDir, 'fonts'),
          listFilesRelative(outDir, 'icons'),
        ]);

        const surahRange = Array.from({ length: 114 }, (_, i) => i + 1);
        const manifest = {
          version: `tq-${Date.now()}`,
          shellPages: SHELL_PAGES,
          assets: [
            '/favicon.svg',
            '/manifest.webmanifest',
            ...fontAssets,
            ...iconAssets,
            ...astroAssets.filter((p) => /\.(js|css|woff2?|svg|png)$/i.test(p)),
          ],
          quranCore: [
            '/quran/v1/meta.json',
            ...surahRange.map((id) => `/quran/v1/surah/${id}.json`),
          ],
          quranExtra: [
            '/quran/v1/search/id.json',
            '/quran/v1/search/en.json',
            '/quran/v1/search/ar.json',
            '/quran/v1/search/tr.json',
            ...surahRange.map((id) => `/quran/v1/tajwid/${id}.json`),
          ],
          tafsir: surahRange.map((id) => `/quran/v1/tafsir/${id}.json`),
        };

        await fs.writeFile(
          path.join(outDir, 'sw-manifest.json'),
          JSON.stringify(manifest),
          'utf8'
        );

        logger.info(
          `Generated sw-manifest.json (${manifest.shellPages.length} pages, ${manifest.assets.length} assets, ${manifest.quranCore.length} core Quran files)`
        );
      },
    },
  };
}
