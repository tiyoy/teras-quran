import { useEffect } from 'preact/hooks';
import {
  ArrowRight,
  BookOpen,
  CircleDot,
  Clock,
  Headphones,
  NotebookPen,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-preact';
import type { Locale } from '@/data/i18n';
import { locale } from '@/stores/locale';

interface LandingCopy {
  pageTitle: string;
  badge: string;
  heroHeadingBefore: string;
  heroHeadingHighlight: string;
  heroHeadingAfter: string;
  heroSubtitle: string;
  ctaRead: string;
  ctaSurahs: string;
  heroBullets: [string, string, string];
  previewSubtitle: string;
  previewMeta: string;
  previewVerse1: string;
  previewVerse2: string;
  previewAudioMeta: string;
  previewOpenSurah: string;
  stats: Array<{ num: string; label: string }>;
  pillarsEyebrow: string;
  pillarsTitle: string;
  pillarsSubtitle: string;
  pillars: Array<{
    eyebrow: string;
    title: string;
    desc: string;
    bullets: [string, string, string];
  }>;
  moreEyebrow: string;
  moreTitle: string;
  moreItems: Array<{ title: string; desc: string }>;
  faqEyebrow: string;
  faqTitle: string;
  faqGuideLink: string;
  faqs: Array<{ q: string; a: string }>;
  closingTitle: string;
  closingDesc: string;
  closingOpenApp: string;
  closingTasbih: string;
  closingRegister: string;
}

const COPY: Record<Locale, LandingCopy> = {
  id: {
    pageTitle: "Al-Qur'an Digital — Teras Qur'an · Baca, Dengarkan, dan Hafalkan Al-Qur'an",
    badge: 'Gratis · Tanpa iklan · Ringan & Offline-first',
    heroHeadingBefore: 'Membaca & Menghafal ',
    heroHeadingHighlight: "Al-Qur'an",
    heroHeadingAfter: ' Lebih Mudah dan Sederhana',
    heroSubtitle:
      "Baca Al-Qur'an 30 juz dengan terjemahan dan tafsir Kemenag RI, warna tajwid, audio murottal ayat demi ayat, jadwal murajaah hafalan, jadwal sholat, arah kiblat, dan tasbih digital kustom.",
    ctaRead: "Baca Al-Qur'an",
    ctaSurahs: 'Lihat daftar surah',
    heroBullets: [
      '• Membaca tanpa akun',
      '• Terjemahan Indonesia & Inggris',
      '• Tersedia offline',
    ],
    previewSubtitle: 'Pembukaan · 7 ayat · Makkiyah',
    previewMeta: 'Juz 1 · Hal. 1',
    previewVerse1: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',
    previewVerse2: 'Segala puji bagi Allah, Tuhan seluruh alam.',
    previewAudioMeta: 'Mishary Rashid Alafasy · Ayat 1',
    previewOpenSurah: 'Buka surah →',
    stats: [
      { num: '114', label: 'Surah lengkap' },
      { num: '30', label: 'Juz & 604 halaman' },
      { num: '6.236', label: 'Ayat & tafsir' },
      { num: '8', label: 'Pilihan qari' },
      { num: '12', label: 'Warna tajwid' },
    ],
    pillarsEyebrow: 'Fitur utama',
    pillarsTitle: 'Satu aplikasi untuk membaca, menghafal, dan beribadah harian',
    pillarsSubtitle: 'Dirancang ringan dengan Astro.js agar responsif di ponsel maupun komputer.',
    pillars: [
      {
        eyebrow: 'Membaca',
        title: 'Buka dari mana saja, baca dengan caramu',
        desc: 'Masuk lewat indeks surah, juz, halaman mushaf, manzil, ruku, atau ayat sajdah. Lengkap dengan warna tajwid dan tafsir Kemenag RI.',
        bullets: [
          '• Mode kartu per ayat & halaman mushaf 604',
          '• Tafsir Ringkas (Wajiz) & Lengkap (Tahlili)',
          '• Pencarian pintar Arab, Latin, ID, EN & lompat ayat',
        ],
      },
      {
        eyebrow: 'Menghafal',
        title: 'Catat hafalan, murajaah tepat waktu',
        desc: 'Penjadwalan murajaah otomatis memakai pengulangan berjarak (SM-2), mode sembunyikan teks Arab, dan latihan sambung ayat.',
        bullets: [
          '• 4 tingkat evaluasi murajaah (Lupa–Sangat lancar)',
          '• Impor hafalan per surah atau juz bertahap 30 hari',
          '• Latihan kuis sambung ayat & khataman bersama',
        ],
      },
      {
        eyebrow: 'Ibadah Harian',
        title: 'Tasbih kustom, jadwal sholat & kiblat',
        desc: 'Lengkap dengan penghitung Tasbih Digital berketukan custom, jadwal sholat kriteria Kemenag RI, kompas kiblat, dan 99 Asmaul Husna.',
        bullets: [
          '• Tasbih dengan target bebas (1–10.000) & dzikir custom',
          "• Rangkaian otomatis Dzikir Ba'da Sholat (100×)",
          '• Waktu sholat, kalender Hijriah & kompas offline',
        ],
      },
    ],
    moreEyebrow: 'Selebihnya',
    moreTitle: 'Yang melengkapi tilawahmu setiap hari',
    moreItems: [
      {
        title: 'Murottal ayat demi ayat',
        desc: '8 pilihan qari, ulangi ayat atau rentang, kecepatan 0.75×–1.5×, jeda talaqqi, timer tidur, dan unduh offline.',
      },
      {
        title: 'Catatan & koleksi ayat',
        desc: 'Tandai ayat favorit, susun koleksi bertema yang bisa diputar berurutan, dan simpan catatan pribadi.',
      },
      {
        title: 'Khataman bersama 30 juz',
        desc: 'Buat grup khataman bersama keluarga atau teman, ambil jatah juz, dan pantau progres secara langsung.',
      },
      {
        title: 'Progres, streak & pengingat',
        desc: 'Target bacaan harian, hari beruntun, grid khatam 30 juz, serta pengingat waktu tilawah pilihanmu.',
      },
      {
        title: 'Pasang & baca offline',
        desc: 'Simpan seluruh teks 114 surah dan indeks ke perangkat agar tetap lancar dibuka tanpa koneksi internet.',
      },
      {
        title: 'Datamu tetap milikmu',
        desc: 'Tanpa iklan dan tanpa pelacakan berlebihan. Unduh seluruh data sebagai JSON atau hapus akun kapan saja.',
      },
    ],
    faqEyebrow: 'Pertanyaan umum',
    faqTitle: 'Yang paling sering ditanyakan',
    faqGuideLink: 'Lihat panduan lengkap →',
    faqs: [
      {
        q: 'Apakah harus membuat akun untuk membaca Al-Qur’an?',
        a: 'Tidak. Kamu bisa langsung membaca seluruh 114 surah, mendengarkan murottal, melihat tafsir, menghitung jadwal sholat, arah kiblat, dan memakai tasbih digital tanpa akun. Akun hanya dibutuhkan bila kamu ingin menyinkronkan data antar perangkat.',
      },
      {
        q: 'Apakah Teras Qur’an bisa digunakan saat offline?',
        a: 'Ya. Seluruh teks 114 surah, terjemahan, tajwid, dan indeks pencarian bisa disimpan ke perangkat lewat Pengaturan → Tampilan → Al-Qur’an offline. Audio murottal per surah juga bisa diunduh terpisah.',
      },
      {
        q: 'Dari mana sumber teks Arab, terjemahan, dan tafsirnya?',
        a: 'Teks Al-Qur’an, terjemahan Indonesia, dan Tafsir Wajiz/Tahlili bersumber dari Kemenag RI (melalui eQuran.id), terjemahan Inggris dari Saheeh International, serta metadata halaman dan markup tajwid dari AlQuran.cloud & Tanzil.',
      },
      {
        q: 'Bagaimana cara kerja fitur Tasbih Digital?',
        a: 'Kamu bisa mengetuk lingkaran hitung atau menekan tombol Spasi di keyboard, memilih target cepat (33, 99, 100, 1000, Tanpa batas) atau angka custom bebas (1–10.000), menjalankan rangkaian Dzikir Ba’da Sholat otomatis, dan menambahkan bacaan dzikir custom sendiri.',
      },
    ],
    closingTitle: 'Mulai membaca hari ini',
    closingDesc:
      'Membaca tidak memerlukan akun. Masuk dengan akun Firebase jika ingin menyamakan progres, hafalan, catatan, dan dzikir tasbih di semua perangkatmu.',
    closingOpenApp: 'Buka aplikasi',
    closingTasbih: 'Buka Tasbih Digital',
    closingRegister: 'Buat akun',
  },
  en: {
    pageTitle: "Al-Qur'an Digital — Teras Qur'an · Read, Listen, and Memorize the Qur'an",
    badge: 'Free · Ad-free · Lightweight & Offline-first',
    heroHeadingBefore: 'Read & Memorize the ',
    heroHeadingHighlight: "Al-Qur'an",
    heroHeadingAfter: ' Simply and Peacefully',
    heroSubtitle:
      'Read all 30 juz of the Qur’an with Indonesian & English translations, tafsir, color-coded tajweed, verse-by-verse murottal audio, spaced-repetition memorization review, prayer times, qibla compass, and custom digital tasbih.',
    ctaRead: "Read Al-Qur'an",
    ctaSurahs: 'Browse surahs',
    heroBullets: [
      '• Read without an account',
      '• Indonesian & English translations',
      '• Works offline',
    ],
    previewSubtitle: 'The Opening · 7 verses · Meccan',
    previewMeta: 'Juz 1 · Page 1',
    previewVerse1: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    previewVerse2: 'All praise is due to Allah, Lord of the worlds.',
    previewAudioMeta: 'Mishary Rashid Alafasy · Verse 1',
    previewOpenSurah: 'Open surah →',
    stats: [
      { num: '114', label: 'Complete surahs' },
      { num: '30', label: 'Juz & 604 pages' },
      { num: '6,236', label: 'Verses & tafsir' },
      { num: '8', label: 'Reciters' },
      { num: '12', label: 'Tajweed colors' },
    ],
    pillarsEyebrow: 'Core features',
    pillarsTitle: 'One app for daily reading, memorization, and worship',
    pillarsSubtitle: 'Built lightweight with Astro.js so it feels fast on phones and desktops alike.',
    pillars: [
      {
        eyebrow: 'Reading',
        title: 'Open from anywhere, read your way',
        desc: 'Browse by surah, juz, mushaf page, manzil, ruku, or sajdah verses—complete with color-coded tajweed and verse tafsir.',
        bullets: [
          '• Verse card view & 604-page mushaf mode',
          '• Concise (Wajiz) & Complete (Tahlili) tafsir',
          '• Smart Arabic, Latin, ID, EN search & direct verse jump',
        ],
      },
      {
        eyebrow: 'Memorization',
        title: 'Track hifz and review right on time',
        desc: 'Automatic murajaah scheduling powered by spaced repetition (SM-2), Arabic hide mode, and verse continuation practice.',
        bullets: [
          '• 4 review quality grades (Forgot to Effortless)',
          '• Import memorized surahs or juz spread over 30 days',
          '• Continue-the-verse quiz & group khataman',
        ],
      },
      {
        eyebrow: 'Daily Worship',
        title: 'Custom tasbih, prayer times & qibla',
        desc: 'Equipped with a customizable Digital Tasbih counter, prayer time schedule, offline qibla compass, and 99 Names of Allah.',
        bullets: [
          '• Tasbih with custom targets (1–10,000) & custom dhikr',
          '• Automated Post-Prayer Dhikr sequence (100×)',
          '• Prayer times, Hijri calendar & offline compass',
        ],
      },
    ],
    moreEyebrow: 'More features',
    moreTitle: 'Everything to support your daily recitation',
    moreItems: [
      {
        title: 'Verse-by-verse murottal',
        desc: '8 reciters, repeat a verse or range, 0.75×–1.5× speed, talaqqi pause, sleep timer, and offline downloads.',
      },
      {
        title: 'Notes & verse collections',
        desc: 'Bookmark favorite verses, organize themed collections that play sequentially, and keep personal reflections.',
      },
      {
        title: '30-juz group khataman',
        desc: 'Create a khataman group with family or friends, claim juz portions, and follow progress live.',
      },
      {
        title: 'Progress, streaks & reminders',
        desc: 'Daily reading targets, streaks, 30-juz khatam grid, and reminders at your preferred reading time.',
      },
      {
        title: 'Install & read offline',
        desc: 'Save all 114 surahs and search indexes directly to your device for smooth offline access.',
      },
      {
        title: 'Your data stays yours',
        desc: 'No ads and no invasive tracking. Export all your data as JSON or delete your account anytime.',
      },
    ],
    faqEyebrow: 'FAQ',
    faqTitle: 'Frequently asked questions',
    faqGuideLink: 'Read full guide →',
    faqs: [
      {
        q: 'Do I need an account to read the Qur’an?',
        a: 'No. You can read all 114 surahs, listen to murottal audio, view tafsir, check prayer times, find the qibla, and use the digital tasbih without signing in. An account is only needed to sync data across devices.',
      },
      {
        q: 'Can Teras Qur’an be used offline?',
        a: 'Yes. All 114 surahs, translations, tajweed markup, and search indexes can be saved to your device under Settings → Appearance → Offline Qur’an. Surah audio can also be downloaded separately.',
      },
      {
        q: 'Where do the Arabic text, translations, and tafsir come from?',
        a: 'The Qur’an text, Indonesian translation, and Wajiz/Tahlili tafsir come from Kemenag RI (via eQuran.id), the English translation is Saheeh International, and page/tajweed metadata comes from AlQuran.cloud & Tanzil.',
      },
      {
        q: 'How does the Digital Tasbih feature work?',
        a: 'Tap the counter circle or press Space on your keyboard, pick a quick target (33, 99, 100, 1000, Unlimited) or any custom count (1–10,000), run the automatic Post-Prayer Dhikr sequence, and create your own custom dhikr entries.',
      },
    ],
    closingTitle: 'Start reading today',
    closingDesc:
      'No account required to read. Sign in with Firebase if you want to sync reading progress, memorization, notes, and tasbih history across all your devices.',
    closingOpenApp: 'Open app',
    closingTasbih: 'Open Digital Tasbih',
    closingRegister: 'Create account',
  },
};

const PILLAR_ICONS = [BookOpen, TrendingUp, CircleDot] as const;
const MORE_ICONS = [Headphones, NotebookPen, Users, Clock, Smartphone, ShieldCheck] as const;

export function LandingContent() {
  const lang = locale.value;
  const c = COPY[lang];

  useEffect(() => {
    document.title = c.pageTitle;
  }, [c.pageTitle]);

  return (
    <div class="mx-auto w-full max-w-5xl overflow-x-clip border-x border-[var(--border)] bg-[var(--background)]">
      {/* HERO */}
      <section class="px-5 py-12 sm:px-10 sm:py-16">
        <div class="grid items-center gap-10 lg:grid-cols-12">
          <div class="min-w-0 lg:col-span-7">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
              <span class="size-2 rounded-full bg-[var(--primary)]" />
              {c.badge}
            </div>

            <p class="quran-text mb-3 text-2xl text-[var(--primary)]" dir="rtl" lang="ar">
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
            </p>

            <h1 class="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl sm:leading-[1.12]">
              {c.heroHeadingBefore}
              <span class="text-[var(--primary)]">{c.heroHeadingHighlight}</span>
              {c.heroHeadingAfter}
            </h1>

            <p class="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)]">
              {c.heroSubtitle}
            </p>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="/app"
                class="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors no-underline"
              >
                <BookOpen class="size-4" />
                {c.ctaRead}
                <ArrowRight class="size-4" />
              </a>
              <a
                href="/app/surah"
                class="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors no-underline"
              >
                {c.ctaSurahs}
              </a>
            </div>

            <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]">
              {c.heroBullets.map((b, i) => (
                <span key={i}>{b}</span>
              ))}
            </div>
          </div>

          {/* Preview Card of Al-Fatihah */}
          <div class="min-w-0 lg:col-span-5">
            <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div class="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <p class="text-sm font-bold text-[var(--foreground)]">Al-Fatihah</p>
                  <p class="text-xs text-[var(--muted-foreground)]">{c.previewSubtitle}</p>
                </div>
                <span class="rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-[var(--accent-foreground)]">
                  {c.previewMeta}
                </span>
              </div>

              <div class="space-y-4">
                <div class="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <p class="quran-text text-right text-2xl text-[var(--foreground)]" dir="rtl" lang="ar">
                    بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                  </p>
                  <p class="mt-2 text-xs italic text-[var(--muted-foreground)]">
                    Bismillāhir-raḥmānir-raḥīm
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-[var(--foreground)]">
                    {c.previewVerse1}
                  </p>
                </div>

                <div class="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <p class="quran-text text-right text-2xl text-[var(--foreground)]" dir="rtl" lang="ar">
                    اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ
                  </p>
                  <p class="mt-2 text-xs italic text-[var(--muted-foreground)]">
                    Al-ḥamdu lillāhi rabbil-‘ālamīn
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-[var(--foreground)]">
                    {c.previewVerse2}
                  </p>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3.5 py-2.5 text-xs">
                <span class="font-medium text-[var(--secondary-foreground)]">
                  {c.previewAudioMeta}
                </span>
                <a href="/app/baca/1" class="font-semibold text-[var(--primary)] hover:underline no-underline">
                  {c.previewOpenSurah}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="grid-rule">
        <span class="grid-node grid-node-start" />
        <span class="grid-node grid-node-end" />
      </div>

      {/* STATS BAR */}
      <section class="grid grid-cols-2 sm:grid-cols-5">
        {c.stats.map((st, idx) => (
          <div
            key={idx}
            class={`px-5 py-6 text-center ${
              idx === 4 ? 'col-span-2 sm:col-span-1' : ''
            } ${idx === 1 || idx === 3 ? 'border-l border-[var(--border)]' : ''} ${
              idx >= 2 ? 'border-t border-[var(--border)] sm:border-t-0' : ''
            } ${idx > 0 ? 'sm:border-l sm:border-[var(--border)]' : ''}`}
          >
            <p class="text-2xl font-bold tracking-tight text-[var(--primary)] tabular-nums">{st.num}</p>
            <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">{st.label}</p>
          </div>
        ))}
      </section>

      <div class="grid-rule">
        <span class="grid-node grid-node-start" />
        <span class="grid-node grid-node-end" />
      </div>

      {/* 3 MAIN PILLARS */}
      <section class="px-5 py-12 sm:px-10 sm:py-16">
        <div class="mb-10 max-w-2xl">
          <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            {c.pillarsEyebrow}
          </p>
          <h2 class="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{c.pillarsTitle}</h2>
          <p class="mt-2 text-sm text-[var(--muted-foreground)]">{c.pillarsSubtitle}</p>
        </div>

        <div class="grid gap-5 md:grid-cols-3">
          {c.pillars.map((pillar, idx) => {
            const Icon = PILLAR_ICONS[idx];
            return (
              <div key={idx} class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div class="mb-4 flex size-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">
                  <Icon class="size-5" />
                </div>
                <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                  {pillar.eyebrow}
                </p>
                <h3 class="mt-1 text-lg font-bold tracking-tight">{pillar.title}</h3>
                <p class="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {pillar.desc}
                </p>
                <ul class="mt-4 space-y-1.5 text-xs text-[var(--foreground)]">
                  {pillar.bullets.map((bullet, bi) => (
                    <li key={bi}>{bullet}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div class="grid-rule">
        <span class="grid-node grid-node-start" />
        <span class="grid-node grid-node-end" />
      </div>

      {/* 6 SUPPORTING FEATURES */}
      <section class="px-5 py-12 sm:px-10 sm:py-16">
        <div class="mb-8 max-w-2xl">
          <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            {c.moreEyebrow}
          </p>
          <h2 class="mt-1 text-2xl font-bold tracking-tight">{c.moreTitle}</h2>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.moreItems.map((item, idx) => {
            const Icon = MORE_ICONS[idx];
            return (
              <div key={idx} class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <Icon class="mb-3 size-5 text-[var(--primary)]" />
                <h3 class="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3>
                <p class="mt-1.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div class="grid-rule">
        <span class="grid-node grid-node-start" />
        <span class="grid-node grid-node-end" />
      </div>

      {/* FAQ */}
      <section class="px-5 py-12 sm:px-10 sm:py-16">
        <div class="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              {c.faqEyebrow}
            </p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight">{c.faqTitle}</h2>
          </div>
          <a href="/panduan" class="text-xs font-semibold text-[var(--primary)] hover:underline">
            {c.faqGuideLink}
          </a>
        </div>

        <div class="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {c.faqs.map((f, idx) => (
            <details key={idx} class="group p-5">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--foreground)]">
                <span>{f.q}</span>
                <span class="text-lg font-normal text-[var(--muted-foreground)] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p class="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div class="grid-rule">
        <span class="grid-node grid-node-start" />
        <span class="grid-node grid-node-end" />
      </div>

      {/* CLOSING CTA */}
      <section class="px-5 py-14 text-center sm:px-10">
        <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">{c.closingTitle}</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm text-[var(--muted-foreground)]">
          {c.closingDesc}
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/app"
            class="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors no-underline"
          >
            {c.closingOpenApp}
            <ArrowRight class="size-4" />
          </a>
          <a
            href="/app/tasbih"
            class="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors no-underline"
          >
            <CircleDot class="size-4 text-[var(--primary)]" />
            {c.closingTasbih}
          </a>
          <a
            href="/auth/register"
            class="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors no-underline"
          >
            {c.closingRegister}
          </a>
        </div>
      </section>
    </div>
  );
}
