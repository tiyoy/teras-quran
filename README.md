# Al-Qur'an Digital — Teras Qur'an

Aplikasi web Al-Qur'an 30 juz yang ringan, cepat, offline-first, dan gratis, dibangun dengan **Astro.js**, **Preact**, **Tailwind CSS v4**, dan **Firebase** (Authentication & Cloud Firestore).

## Fitur Utama

- **Al-Qur'an 30 Juz:** 114 surah, 30 juz, 604 halaman mushaf standar Madinah, 7 manzil, 556 ruku, dan 15 ayat sajdah.
- **Reader Lengkap:** Tampilan Kartu per ayat & Halaman Mushaf, 12 warna hukum tajwid + kuis latihan tajwid, Tafsir Kemenag RI (Ringkas Wajiz & Lengkap Tahlili), mode hafalan (sembunyikan teks Arab), dan bagikan ayat sebagai gambar Canvas (100% di browser).
- **Pemutar Audio Murottal Persisten:** 8 pilihan qari (Murattal & Mujawwad), kecepatan 0.75×–1.5×, ulangi ayat/rentang, jeda talaqqi, timer tidur, dan unduh surah offline.
- **Pencarian Pintar:** Cari terjemahan Indonesia, Inggris, teks Arab (dengan/tanpa harakat), bacaan latin, frasa tanda kutip, atau langsung lompat ayat (`2:255`, `yasin 1`).
- **Pribadi & Hafalan:** Bacaan terakhir, ayat favorit & koleksi kustom, catatan pribadi, surah pilihan, progres bacaan & khatam 30 juz (bitmask 6.236 ayat), jadwal murajaah otomatis **SM-2 Spaced Repetition**, latihan sambung ayat, dan **Khataman Bersama 30 Juz**.
- **Ibadah Harian & Tasbih Digital:** Jadwal sholat kriteria Kemenag RI + kalender Hijriah offline, Kompas Kiblat, 99 Asmaul Husna, dan **Tasbih Digital** dengan ketukan cepat (sentuh/Spasi), target jumlah custom (`1–10.000` atau tanpa batas), mode rangkaian Dzikir Ba'da Sholat (`33→33→33→1`), CRUD dzikir custom, suara klik sintetis, serta getar haptik.
- **Desain Biru Safir Datar (Anti AI Slop):** Mode Terang & Gelap, 100% warna solid tanpa gradasi, dan 100% ikon garis SVG tanpa emoji.

## Memulai di Lokal

```bash
# 1. Pasang dependensi
npm install

# 2. (Opsional jika /public/quran/v1 belum ada) Unduh dataset Al-Qur'an statis sekali jalan
npm run fetch:quran

# 3. (Opsional) Konfigurasi Firebase untuk login & sinkronisasi cloud
# Jika tidak diisi, aplikasi tetap berjalan penuh dalam mode lokal (localStorage).
cp .env.example .env

# 4. Jalankan server pengembangan
npm run dev
```

## Perintah Penting

- `npm run dev` — Menjalankan server pengembangan Astro
- `npm run build` — Membangun situs statis ke folder `dist/`
- `npm run preview` — Meninjau hasil build produksi
- `npm run check` — Pemeriksaan tipe TypeScript & Astro
- `npm test` — Menjalankan seluruh unit test Vitest
- `npm run fetch:quran` — Memperbarui dataset statis `/public/quran/v1/` dari eQuran.id + AlQuran.cloud

## Konfigurasi Firebase

1. Buat proyek di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Authentication** (Provider: Google dan Email/Password).
3. Aktifkan **Cloud Firestore** lalu terapkan aturan keamanan dari [`firestore.rules`](./firestore.rules).
4. Salin `.env.example` menjadi `.env` dan isi seluruh nilai `PUBLIC_FIREBASE_*`.

## Pedoman Proyek

Lihat spesifikasi lengkap pada [`PRD.md`](./PRD.md).

## Lisensi

Lisensi MIT. © Cecep Maulanaツ.
