#!/usr/bin/env node
/**
 * Mengunduh seluruh data Al-Qur'an statis sekali jalan dari API publik (eQuran.id + AlQuran.cloud)
 * dan menyimpannya ke /public/quran/v1/ agar aplikasi ringan, cepat, dan bisa dibaca offline.
 *
 * Penggunaan: npm run fetch:quran
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'quran', 'v1');
const FORCE = process.argv.includes('--force');

const CODE_TO_GROUP = {
  g: 'ghunnah',
  f: 'ikhfa',
  c: 'ikhfa',
  a: 'idghamBigunnah',
  w: 'idghamBigunnah',
  u: 'idghamBilagunnah',
  d: 'idghamMutajanisain',
  b: 'idghamMutajanisain',
  i: 'iqlab',
  q: 'qalqalah',
  n: 'madThabii',
  o: 'madWajibJaiz',
  p: 'madArid',
  m: 'madLazim',
  h: 'silent',
  l: 'silent',
  s: 'silent',
};

function parseTajweedMarkup(raw) {
  if (!raw) return [];
  const out = [];
  const push = (text, group) => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev[1] === group) prev[0] += text;
    else out.push([text, group]);
  };
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '[') {
      const innerOpen = raw.indexOf('[', i + 1);
      const header = innerOpen > i ? raw.slice(i + 1, innerOpen) : '';
      if (/^[a-z](?::\d+)?$/i.test(header) && innerOpen > i) {
        const closeIdx = raw.indexOf(']', innerOpen + 1);
        if (closeIdx > innerOpen) {
          const group = CODE_TO_GROUP[header[0].toLowerCase()] ?? null;
          push(raw.slice(innerOpen + 1, closeIdx), group);
          i = closeIdx + 1;
          continue;
        }
        push(raw.slice(innerOpen + 1), null);
        break;
      }
    }
    const next = raw.indexOf('[', i + 1);
    const end = next === -1 ? raw.length : next;
    push(raw.slice(i, end), null);
    i = end;
  }
  return out;
}

async function fetchJson(url, retries = 4) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TerasQuranDataBuilder/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * attempt * attempt));
      }
    }
  }
  throw lastErr;
}

function summarizeTafsir(longText) {
  if (!longText) return '';
  const cleaned = String(longText).replace(/\r\n/g, '\n').trim();
  const paras = cleaned.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length) return cleaned.slice(0, 420);
  let out = paras[0];
  if (out.length < 180 && paras[1]) out += '\n\n' + paras[1];
  if (out.length > 650) {
    const cut = out.slice(0, 650);
    const lastDot = cut.lastIndexOf('.');
    out = lastDot > 240 ? cut.slice(0, lastDot + 1) : cut + '…';
  }
  return out;
}

function writeJson(relPath, data) {
  const full = path.join(OUT_DIR, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data), 'utf8');
}

async function main() {
  for (const sub of ['surah', 'tafsir', 'tajwid', 'search']) {
    fs.mkdirSync(path.join(OUT_DIR, sub), { recursive: true });
  }

  console.log('[1/4] Mengunduh metadata resmi 30 Juz, 604 Halaman, Manzil, Ruku, Sajda...');
  const cloudMeta = (await fetchJson('https://api.alquran.cloud/v1/meta')).data;
  const eqList = (await fetchJson('https://equran.id/api/v2/surat')).data;

  const surahs = eqList.map((s) => {
    const ref = cloudMeta.surahs.references.find((r) => r.number === s.nomor);
    const isMeccan = s.tempatTurun.toLowerCase().includes('mek');
    return {
      id: s.nomor,
      name: s.namaLatin,
      arabicName: s.nama,
      arabicFull: ref?.name ?? s.nama,
      meaning: s.arti,
      englishName: ref?.englishName ?? s.namaLatin,
      englishMeaning: ref?.englishNameTranslation ?? s.arti,
      revelation: isMeccan ? 'Makkiyah' : 'Madaniyah',
      revelationEn: isMeccan ? 'Meccan' : 'Medinan',
      ayahCount: s.jumlahAyat,
      description: String(s.deskripsi ?? '').replace(/<[^>]+>/g, '').trim(),
    };
  });

  const surahMap = new Map(surahs.map((s) => [s.id, s]));

  const meta = {
    surahs,
    juzs: cloudMeta.juzs.references.map((j, idx) => ({
      juz: idx + 1,
      surah: j.surah,
      ayah: j.ayah,
      surahName: surahMap.get(j.surah)?.name ?? '',
    })),
    pages: cloudMeta.pages.references.map((p, idx) => ({
      page: idx + 1,
      surah: p.surah,
      ayah: p.ayah,
      surahName: surahMap.get(p.surah)?.name ?? '',
    })),
    manzils: cloudMeta.manzils.references.map((m, idx) => ({
      manzil: idx + 1,
      surah: m.surah,
      ayah: m.ayah,
      surahName: surahMap.get(m.surah)?.name ?? '',
    })),
    rukus: cloudMeta.rukus.references.map((r, idx) => ({
      ruku: idx + 1,
      surah: r.surah,
      ayah: r.ayah,
      surahName: surahMap.get(r.surah)?.name ?? '',
    })),
    sajdas: cloudMeta.sajdas.references.map((sj, idx) => ({
      id: idx + 1,
      surah: sj.surah,
      ayah: sj.ayah,
      surahName: surahMap.get(sj.surah)?.name ?? '',
      obligatory: Boolean(sj.obligatory),
      recommended: Boolean(sj.recommended),
    })),
  };

  writeJson('meta.json', meta);
  console.log(`     meta.json siap (${surahs.length} surah, ${meta.pages.length} halaman, ${meta.sajdas.length} sajdah).`);

  console.log('[2/4] Mengunduh 114 surah (Arab, Latin, Terjemahan ID/EN, Tajwid, Tafsir)...');
  const queue = Array.from({ length: 114 }, (_, i) => i + 1);
  let completed = 0;

  async function processSurah(num) {
    const surahFile = path.join(OUT_DIR, 'surah', `${num}.json`);
    const tafsirFile = path.join(OUT_DIR, 'tafsir', `${num}.json`);
    const tajwidFile = path.join(OUT_DIR, 'tajwid', `${num}.json`);

    if (!FORCE && fs.existsSync(surahFile) && fs.existsSync(tafsirFile) && fs.existsSync(tajwidFile)) {
      completed++;
      return;
    }

    const [eqSurahRes, eqTafsirRes, cloudRes] = await Promise.all([
      fetchJson(`https://equran.id/api/v2/surat/${num}`),
      fetchJson(`https://equran.id/api/v2/tafsir/${num}`),
      fetchJson(`https://api.alquran.cloud/v1/surah/${num}/editions/quran-tajweed,en.sahih`),
    ]);

    const eqAyahs = eqSurahRes.data.ayat;
    const eqTafsir = eqTafsirRes.data.tafsir;
    const tajweedEdition = cloudRes.data[0].ayahs;
    const enEdition = cloudRes.data[1].ayahs;

    const ayahs = eqAyahs.map((a, idx) => {
      const cAyah = tajweedEdition[idx];
      const enAyah = enEdition[idx];
      return {
        i: cAyah.number,
        n: a.nomorAyat,
        ar: a.teksArab.trim(),
        tr: a.teksLatin.trim(),
        tid: a.teksIndonesia.trim(),
        ten: (enAyah?.text ?? '').trim(),
        juz: cAyah.juz,
        page: cAyah.page,
        ruku: cAyah.ruku,
        manzil: cAyah.manzil,
        hizb: cAyah.hizbQuarter,
        sajda: Boolean(cAyah.sajda),
      };
    });

    const tafsirItems = eqTafsir.map((t) => ({
      n: t.ayat,
      short: summarizeTafsir(t.teks),
      long: String(t.teks ?? '').replace(/\r\n/g, '\n').trim(),
    }));

    const tajwidItems = tajweedEdition.map((cAyah) => ({
      n: cAyah.numberInSurah,
      segments: parseTajweedMarkup(cAyah.text),
    }));

    writeJson(`surah/${num}.json`, { surah: num, ayahs });
    writeJson(`tafsir/${num}.json`, { surah: num, items: tafsirItems });
    writeJson(`tajwid/${num}.json`, { surah: num, items: tajwidItems });

    completed++;
    if (completed % 15 === 0 || completed === 114) {
      console.log(`     Progres surah: ${completed}/114`);
    }
  }

  async function worker() {
    while (queue.length) {
      const num = queue.shift();
      await processSurah(num);
    }
  }

  await Promise.all(Array.from({ length: 6 }, worker));

  console.log('[3/4] Membangun indeks pencarian 4 bahasa (id, en, ar, tr)...');
  const idxId = [];
  const idxEn = [];
  const idxAr = [];
  const idxTr = [];
  let totalAyahs = 0;

  for (let num = 1; num <= 114; num++) {
    const s = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'surah', `${num}.json`), 'utf8'));
    for (const a of s.ayahs) {
      totalAyahs++;
      idxId.push([a.i, num, a.n, a.tid]);
      idxEn.push([a.i, num, a.n, a.ten]);
      idxAr.push([a.i, num, a.n, a.ar]);
      idxTr.push([a.i, num, a.n, a.tr]);
    }
  }

  writeJson('search/id.json', idxId);
  writeJson('search/en.json', idxEn);
  writeJson('search/ar.json', idxAr);
  writeJson('search/tr.json', idxTr);

  console.log(`[4/4] Selesai! Total ${totalAyahs} ayat, 114 surah, 114 tafsir, 114 tajwid, 4 indeks pencarian.`);
}

main().catch((err) => {
  console.error('Gagal mengunduh data Al-Qur’an:', err);
  process.exit(1);
});
