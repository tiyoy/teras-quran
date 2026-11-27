# Teras Qur'an (Al-Qur'an Digital) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lightweight Indonesian Al-Qur'an web application **Teras Qur'an** in Astro.js + Preact + Tailwind CSS v4 + Firebase, replicating every non-Madrasah feature of `kelaspondok.com` with a flat Sapphire Blue visual system and a new customizable **Tasbih Digital** module.

**Architecture:** Static Astro MPA (`output: 'static'`) with zero-JS public pages (`/`, `/panduan`, `/tentang`, `/privacy-policy`) and `<ClientRouter />` + `transition:persist` on `/app/*` so the sidebar and audio player persist across navigation. Interactive features use lightweight Preact Islands backed by Preact Signals stores that run local-first (`localStorage` + Cache API) and automatically sync to Cloud Firestore when Firebase credentials are configured and the user signs in. All Quran text, tafsir, tajwid, and search indices are pre-fetched once into `/public/quran/v1/` static JSON.

**Tech Stack:** Astro 5/7, `@astrojs/preact`, Preact, `@preact/signals`, Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-preact`, `firebase` v13 (Auth + Firestore), `adhan`, `@fontsource-variable/plus-jakarta-sans`, Vitest.

**Spec:** [PRD.md](file:///c:/Users/Public/Nitip/Codingan/Javascript/teras-quran/PRD.md)

## Global Constraints

- **Branding:** Title `Al-Qur'an Digital`, subtitle `Teras Qur'an` (never `Kelas Pondok`).
- **Footer (exact):** `Al-Qur'an Digital oleh <a href="/tentang">Teras Qur'an</a>. Lisensi MIT. © <script is:inline>document.write(new Date().getFullYear());</script> Cecep Maulanaツ.`
- **Anti AI Slop:** Zero emoji characters as UI icons (only `lucide-preact` SVGs + custom geometric SVGs for Rehal logo, Rosette, Compass); zero CSS gradients (`linear-gradient`, `radial-gradient`, `conic-gradient`, `bg-gradient-*`) anywhere in CSS, components, or Canvas image exports.
- **Sapphire Blue Palette:** Light `--primary: #0F52BA` (`--background: #F7F9FC`, `--sidebar: #F1F5FA`, `--card: #FFFFFF`, `--accent: #E1ECFA`, `--border: #DCE3EE`, `--gold: #C6922E`); Dark `--primary: #5C9AFF` (`--background: #080F1A`, `--sidebar: #0C1524`, `--card: #111C2E`, `--accent: #142744`, `--border: #1F2E47`, `--gold: #DFB65B`); plus all 12 Tajwid color tokens verbatim from PRD Section 2.3.
- **Typography:** `Plus Jakarta Sans Variable` for UI, `LPMQ` / `Amiri Quran` for Arabic (`dir="rtl" lang="ar"`), `tabular-nums` for all counters, timers, prayer times, and degrees.
- **Madrasah Excluded:** Zero routes, nav links, settings cards, onboarding items, or privacy text referencing Madrasah, kelas, santri, mentor, tugas, or chat.
- **Firebase Graceful Fallback:** App must build and work completely when `.env` is absent or empty (local-first mode via `localStorage`), shipping `.env.example` and `firestore.rules`.

## Review Focus

1. **Corrupted/empty `localStorage` or unconfigured Firebase `.env`:** Stores and Firebase client must never throw on invalid JSON, quota errors, or missing `PUBLIC_FIREBASE_*` keys — fall back cleanly to defaults/local mode. (Pinned in Task 3 & Task 5)
2. **Tajwid bracket parsing edge cases (nested/unknown codes, surah 1 & 9 Bismillah handling):** Malformed or unfamiliar `[x:id[...]]` tags from `alquran.cloud` must degrade safely to plain text without swallowing Arabic letters. (Pinned in Task 2)
3. **Arabic search diacritic/alif-wasla/Indonesian spelling normalization & verse reference bounds:** Queries like `2:287` (out of range for Al-Baqarah's 286 ayahs) must return `null` rather than broken links, while `yasin 1`, `2:255`, `sholat`/`salat`, and unvowelled Arabic match accurately. (Pinned in Task 3)
4. **SM-2 Hifz range merging & date rollover:** Merging overlapping/adjacent ranges (e.g., 1–5 + 6–10, or 1–10 covering 3–5) must preserve earliest `dueDate`/`memorizedAt` and never produce duplicate or out-of-bounds ayah ranges. (Pinned in Task 4)
5. **Tasbih custom target & Ba'da Sholat sequence edge cases:** Custom targets `0` (unlimited), `1`, `10000`, rapid double taps, `-1` undo at `0` (must clamp at `0`), and stepping through `33→33→33→1` must never produce negative counts or NaN progress percentages. (Pinned in Task 4)

---

### Task 1: Project Scaffold, Sapphire Design Tokens, Fonts & Logo

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `firestore.rules`, `.gitignore`
- Create: `src/styles/global.css`
- Create: `public/favicon.svg`, `public/manifest.webmanifest`, `public/sw.js`
- Create: `public/fonts/lpmq.woff2`, `public/fonts/amiri-quran.woff2` (downloaded once from open-source font CDN / verified local copy)
- Create: `src/components/ui/BrandLogo.tsx`, `src/components/ui/Rosette.tsx`

**Interfaces:**
- Produces: CSS custom properties in `src/styles/global.css` (`--background`, `--primary`, `--tajwid-*`, `.quran-text`, `.tajwid-text`), `BrandLogo({ subtitle?: string, compact?: boolean })`, `Rosette({ number: number, size?: 'sm' | 'md' })`.

- [ ] **Step 1: Initialize `package.json`, Astro, Preact, Tailwind v4, Vitest, Firebase, Adhan, Lucide, Plus Jakarta Sans**
  Configure scripts: `dev`, `build`, `preview`, `check`, `test`, `fetch:quran`. Install dependencies with `npm install`.
- [ ] **Step 2: Create `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `firestore.rules`, `.gitignore`**
  Enable `@astrojs/preact` (`compat: false`), Tailwind v4 Vite plugin, `output: 'static'`, and Vitest path aliases (`@/*` → `src/*`). Write complete `firestore.rules` matching PRD Section 7.3.
- [ ] **Step 3: Create `src/styles/global.css`, `public/favicon.svg`, `public/manifest.webmanifest`, `public/sw.js`, and download `lpmq.woff2` & `amiri-quran.woff2`**
  Implement exact Light/Dark Biru Safir tokens and 12 Tajwid color classes from PRD Section 2.2–2.3. Zero gradients. Write flat Rehal SVG in `favicon.svg` (`#0F52BA` + `#C6922E`).
- [ ] **Step 4: Create `BrandLogo.tsx` and `Rosette.tsx`**
  `BrandLogo` renders flat Rehal SVG + `Al-Qur'an Digital` + `Teras Qur'an`. `Rosette` renders geometric 8-point SVG frame with `tabular-nums`.
- [ ] **Step 5: Verify scaffold builds & passes config checks**
  Run: `npx astro check && npx vitest run --passWithNoTests`
  Expected: Exit code 0 with zero TypeScript errors.
- [ ] **Step 6: Initialize git repository and commit**
  Run: `git init && git add -A && git commit -m "chore: scaffold Astro + Preact + Tailwind v4 with Sapphire design tokens"`

---

### Task 2: Static Quran Data Pipeline (`scripts/fetch-quran-data.mjs`) & Tajwid Parser

**Files:**
- Create: `src/lib/quran/tajwid-parser.ts`
- Create: `scripts/fetch-quran-data.mjs`
- Create: `tests/tajwid-parser.test.ts`
- Output (generated): `public/quran/v1/meta.json`, `public/quran/v1/surah/{1..114}.json`, `public/quran/v1/tafsir/{1..114}.json`, `public/quran/v1/tajwid/{1..114}.json`, `public/quran/v1/search/{id,en,ar,tr}.json`

**Interfaces:**
- Produces:
  - `TAJWID_GROUPS: readonly TajwidGroup[]` (12 group IDs matching CSS `.tajwid-*`)
  - `parseTajweedMarkup(raw: string): TajwidSegment[]` where `TajwidSegment = [text: string, group: TajwidGroup | null]`
  - Static JSON files in `public/quran/v1/` conforming to PRD Section 6.

- [ ] **Step 1: Write failing tests in `tests/tajwid-parser.test.ts`**
  Assert `parseTajweedMarkup`:
  - maps `[h:1[ٱ]للَّهِ [l[ل]رَّحْمَ[n[ـٰ]نِ [p[ِي]مِ` to `silent`, `madThabii`, `madArid` segments preserving all Arabic text verbatim;
  - maps all 12 groups (`g`→`ghunnah`, `f`/`c`→`ikhfa`, `a`/`w`→`idghamBigunnah`, `u`→`idghamBilagunnah`, `d`/`b`→`idghamMutajanisain`, `i`→`iqlab`, `q`→`qalqalah`, `n`→`madThabii`, `o`/`m`→`madWajibJaiz`, `p`→`madArid`, `m` with `6`→`madLazim`, `h`/`l`/`s`→`silent`);
  - degrades unknown tag `[z:9[abc]` or unclosed `[h:1[abc` safely to plain text without dropping characters (Review Focus #2).
- [ ] **Step 2: Run test to verify failure**
  Run: `npx vitest run tests/tajwid-parser.test.ts`
  Expected: FAIL (`parseTajweedMarkup` not found).
- [ ] **Step 3: Implement `src/lib/quran/tajwid-parser.ts` and re-run test**
  Run: `npx vitest run tests/tajwid-parser.test.ts`
  Expected: PASS.
- [ ] **Step 4: Implement `scripts/fetch-quran-data.mjs` and run `npm run fetch:quran`**
  Fetch `api.alquran.cloud/v1/meta`, `equran.id/api/v2/surat/{1..114}`, `equran.id/api/v2/tafsir/{1..114}`, and `api.alquran.cloud/v1/surah/{1..114}/editions/quran-tajweed,en.sahih` with concurrency throttling (6 concurrent, retry with backoff) and write compact JSON to `public/quran/v1/`. Verify file counts: `meta.json` (114 surahs, 30 juzs, 604 pages, 7 manzils, 556 rukus, 15 sajdas), 114 surah JSONs (total 6,236 ayahs), 114 tafsir JSONs, 114 tajwid JSONs, 4 search JSONs.
- [ ] **Step 5: Commit**
  Run: `git add src/lib/quran/tajwid-parser.ts scripts/fetch-quran-data.mjs tests/tajwid-parser.test.ts public/quran/v1 && git commit -m "feat: add tajwid parser and static Quran dataset pipeline"`

---

### Task 3: Core Pure Domain Libraries (Quran Meta, Ayah Bitmask, Search Logic, Prayer Times, Qibla)

**Files:**
- Create: `src/lib/quran/meta.ts`, `src/lib/quran/ayah-mask.ts`, `src/lib/quran/search-logic.ts`, `src/lib/quran/api.ts`
- Create: `src/lib/worship/prayer-times.ts`, `src/lib/worship/hijri.ts`, `src/lib/worship/qibla.ts`
- Create: `src/data/reciters.ts`, `src/data/asmaul-husna.ts`, `src/data/cities-id.ts`, `src/data/tajwid-rules.ts`, `src/data/i18n.ts`
- Create: `tests/ayah-mask.test.ts`, `tests/search-logic.test.ts`, `tests/qibla-and-prayer.test.ts`

**Interfaces:**
- Consumes: `public/quran/v1/*` JSON schemas, `adhan`.
- Produces:
  - `toGlobalAyah(surahId, ayahNum): number`, `fromGlobalAyah(id): { surah, ayah } | null`, `getJuzForAyah(id): number`, `SURAH_AYAH_COUNTS` (length 114, sum 6236)
  - `createMask()`, `markAyahs(base64, ids): { readMask, readCount, added }`, `juzCoverage(base64): number[]` (length 30, 0..1)
  - `parseVerseReference(query, surahs): { surah, ayah } | null`, `searchIndex(index, query, limit?)`, `highlightMatches(text, terms, lang)`
  - `computeDailyPrayerTimes(date, lat, lng, tz)` (Kemenag RI: Fajr 20°, Isha 18°, Shafi, +2m ihtiyat, Imsak = Fajr − 10m), `computeMonthlyPrayerTimes(year, month, lat, lng, tz)`
  - `computeQiblaBearing(lat, lng): number`, `computeKaabaDistanceKm(lat, lng): number`, `shortestAngleDelta(heading, bearing): number`
  - `formatHijriDate(date, offsetDays, locale)`, `getRamadanStatus(date, offsetDays)`
  - `t(key, params?)` i18n helper (`id` default, `en` supported)

- [ ] **Step 1: Write failing tests in `tests/ayah-mask.test.ts`, `tests/search-logic.test.ts`, `tests/qibla-and-prayer.test.ts`**
  Include Review Focus #1 (corrupted Base64 mask returns empty mask safely) and Review Focus #3 (`2:287` returns `null`, `2:255` & `yasin 1` resolve accurately, unvowelled Arabic & `sholat`/`salat` match, exact quoted phrase ranked first, Jakarta Qibla bearing `295.15 ± 0.5°`, Kemenag prayer order `imsak < fajr < sunrise < dhuhr < asr < maghrib < isha`).
- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/ayah-mask.test.ts tests/search-logic.test.ts tests/qibla-and-prayer.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement domain libraries & static datasets (`asmaul-husna.ts` 99 names, `cities-id.ts` 90+ Indonesian cities across WIB/WITA/WIT, `reciters.ts` 8 qaris, `tajwid-rules.ts` 12 rules, `i18n.ts` ID+EN)**
- [ ] **Step 4: Run tests to verify pass**
  Run: `npx vitest run tests/ayah-mask.test.ts tests/search-logic.test.ts tests/qibla-and-prayer.test.ts`
  Expected: PASS.
- [ ] **Step 5: Commit**
  Run: `git add src/lib/quran src/lib/worship src/data tests/ && git commit -m "feat: add core Quran, search, prayer times, Qibla libraries and static datasets"`

---

### Task 4: Hifz SM-2 Algorithm, Sambung Ayat Engine & Tasbih Core Logic

**Files:**
- Create: `src/lib/hifz/sm2.ts`, `src/lib/hifz/sambung-logic.ts`
- Create: `src/lib/tasbih/tasbih-logic.ts`, `src/lib/tasbih/sound.ts`, `src/lib/tasbih/haptic.ts`
- Create: `src/data/tasbih-presets.ts`
- Create: `tests/sm2.test.ts`, `tests/tasbih-logic.test.ts`

**Interfaces:**
- Consumes: `SURAH_AYAH_COUNTS`, `JUZ_START_AYAH`, `fromGlobalAyah` from `src/lib/quran/meta.ts`.
- Produces:
  - `rateHifzItem(item, rating: 1 | 3 | 4 | 5, todayKey): ReviewOutcome`
  - `mergeHifzRange(existing, newRange, now, todayKey): MergePlan`
  - `buildBulkImportRanges(kind: 'surah' | 'juz', id: number): ImportSpec[]` (staggered 1..30 days)
  - `getHifzStrength(item): 'weak' | 'fair' | 'strong'`
  - `generateSambungQuestions(ayahPool, count): SambungQuestion[]`
  - `tapTasbih(state, target, autoNextRound): { nextState, reachedTarget }`
  - `undoTasbih(state): TasbihCounterState` (clamps at 0)
  - `advanceBadaSholatStep(state): BadaSholatState` (`33→33→33→1` sequence)
  - `validateCustomTarget(n): number` (`0` for unlimited or clamped integer `1..10000`)
  - `playClickTone(isTargetReached?: boolean)` (Web Audio API 800Hz 18ms / two-tone chime), `triggerHaptic(isTargetReached?: boolean)`

- [ ] **Step 1: Write failing tests in `tests/sm2.test.ts` and `tests/tasbih-logic.test.ts`**
  Pin Review Focus #4 (SM-2 rating 1/3/4/5 math, ease clamped 1.3–3.0, interval capped 60, merging adjacent `[1..5]` + `[6..10]` → `[1..10]`, covering range no-op, staggered 30-day juz import) and Review Focus #5 (custom target `0`/`1`/`40`/`10000`, target rollover increments round, stop-at-target mode, undo at 0 stays 0, Ba'da Sholat 4-step sequence completes at 100 total taps).
- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/sm2.test.ts tests/tasbih-logic.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement `sm2.ts`, `sambung-logic.ts`, `tasbih-logic.ts`, `sound.ts`, `haptic.ts`, `tasbih-presets.ts`**
- [ ] **Step 4: Run tests to verify pass**
  Run: `npx vitest run tests/sm2.test.ts tests/tasbih-logic.test.ts`
  Expected: PASS.
- [ ] **Step 5: Commit**
  Run: `git add src/lib/hifz src/lib/tasbih src/data/tasbih-presets.ts tests/sm2.test.ts tests/tasbih-logic.test.ts && git commit -m "feat: implement SM-2 hifz scheduling, sambung ayat, and tasbih core logic"`

---

### Task 5: Firebase Layer (with Local-First Graceful Fallback) & Reactive Preact Stores

**Files:**
- Create: `src/lib/storage.ts` (safe JSON `localStorage` wrapper handling SSR, corrupted JSON, QuotaExceededError)
- Create: `src/lib/firebase/client.ts`, `src/lib/firebase/auth.ts`, `src/lib/firebase/firestore.ts`
- Create: `src/stores/theme.ts`, `src/stores/locale.ts`, `src/stores/toast.ts`, `src/stores/auth.ts`, `src/stores/reader-settings.ts`, `src/stores/audio-player.ts`, `src/stores/library.ts`, `src/stores/progress.ts`, `src/stores/hifz.ts`, `src/stores/khataman.ts`, `src/stores/location.ts`, `src/stores/reminders.ts`, `src/stores/notifications.ts`, `src/stores/tasbih.ts`, `src/stores/offline.ts`
- Create: `tests/storage-and-firebase.test.ts`

**Interfaces:**
- Consumes: Domain modules from Tasks 3 & 4, `firebase/app`, `firebase/auth`, `firebase/firestore`.
- Produces:
  - `isFirebaseConfigured: boolean`
  - Safe `readStorage<T>(key, fallback): T`, `writeStorage(key, value): boolean`
  - Signal stores for every app subsystem matching Firestore paths (PRD Section 7.2) and `localStorage` keys (PRD Section 7.4).

- [ ] **Step 1: Write failing test in `tests/storage-and-firebase.test.ts`**
  Pin Review Focus #1: `readStorage` recovers gracefully from malformed JSON; `isFirebaseConfigured` is `false` without env vars and `auth`/`firestore` helpers never throw unhandled exceptions when called unconfigured.
- [ ] **Step 2: Run test to verify failure**
  Run: `npx vitest run tests/storage-and-firebase.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement `src/lib/storage.ts`, `src/lib/firebase/*`, and all Preact Signal stores**
  Ensure Firestore listeners attach on verified sign-in, detach cleanly on sign-out, support account JSON export (`exportAllUserData`) and permanent account deletion (`deleteAccountCascade`), and sync Tasbih presets/logs, Hifz, Khatam, Reading Days, Favorites, Collections, Notes, Saved Surahs, Reminders, and Khataman transactions.
- [ ] **Step 4: Run full Vitest suite**
  Run: `npx vitest run`
  Expected: All unit tests PASS.
- [ ] **Step 5: Commit**
  Run: `git add src/lib/storage.ts src/lib/firebase src/stores tests/storage-and-firebase.test.ts && git commit -m "feat: add Firebase auth/Firestore layer with local fallback and signal stores"`

---

### Task 6: Shared UI Primitives, Layouts (`PublicLayout`, `AuthLayout`, `AppLayout`), Command Palette & Persistent Audio Player

**Files:**
- Create: `src/components/ui/Primitives.tsx` (Button, Card, Badge, Modal/Dialog, Drawer/Sheet, Switch, Slider, Tabs, EmptyState, ToastContainer — all flat Sapphire Blue, zero gradients, zero emojis)
- Create: `src/components/shell/ThemeToggle.tsx`, `src/components/shell/LocaleToggle.tsx`, `src/components/shell/AppSidebar.tsx`, `src/components/shell/AppTopbar.tsx`, `src/components/shell/CommandPalette.tsx`, `src/components/shell/MobileBottomNav.tsx`, `src/components/shell/AudioPlayerBar.tsx`, `src/components/shell/ReminderRunner.tsx`
- Create: `src/layouts/BaseHead.astro`, `src/layouts/PublicLayout.astro`, `src/layouts/AuthLayout.astro`, `src/layouts/AppLayout.astro`

**Interfaces:**
- Consumes: `BrandLogo`, stores from Task 5, `lucide-preact`.
- Produces: Complete layout shells ready for all pages.
  - `PublicLayout.astro`: Pure static MPA (no `<ClientRouter />`), exact footer: `Al-Qur'an Digital oleh <a href="/tentang">Teras Qur'an</a>. Lisensi MIT. © <script is:inline>document.write(new Date().getFullYear());</script> Cecep Maulanaツ.`
  - `AppLayout.astro`: Astro `<ClientRouter />` with `transition:persist="sidebar"` on sidebar and `transition:persist="audio-player"` on `AudioPlayerBar`, active nav highlighting updated on `astro:page-load`, 3 sidebar groups (AL-QUR'AN, PRIBADI, IBADAH including Tasbih) + Panduan & Pengaturan at bottom, 5-item mobile bottom nav (Beranda, Surah, Bacaanku, Tasbih, Tersimpan).
  - `AudioPlayerBar`: Play/Pause, Prev/Next, Scrubber, Speed (`0.75×–1.5×`), Repeat Ayah (`1/2/3/5/∞`), Range Repeat, Gap (`0/2/5/ayah`), Sleep Timer, Qari selector (8 choices), Download Surah Offline button, MediaSession API.

- [ ] **Step 1: Implement `Primitives.tsx` and shell Preact islands (`ThemeToggle`, `LocaleToggle`, `AppSidebar`, `AppTopbar`, `CommandPalette`, `MobileBottomNav`, `AudioPlayerBar`, `ReminderRunner`)**
- [ ] **Step 2: Implement `BaseHead.astro` (with synchronous inline anti-FOUC theme script), `PublicLayout.astro`, `AuthLayout.astro`, and `AppLayout.astro`**
- [ ] **Step 3: Verify TypeScript/Astro compilation**
  Run: `npx astro check`
  Expected: 0 errors.
- [ ] **Step 4: Commit**
  Run: `git add src/components/ui src/components/shell src/layouts && git commit -m "feat: build flat Sapphire UI primitives, Astro layouts, command palette, and persistent audio player"`

---

### Task 7: Public Pages (`/`, `/panduan`, `/tentang`, `/privacy-policy`, `/404`) & Auth Pages (`/auth/*`)

**Files:**
- Create: `src/data/guide-topics.ts`
- Create: `src/components/public/LandingPreview.tsx`, `src/components/public/GuideFilter.tsx`, `src/components/auth/AuthForms.tsx`
- Create: `src/pages/index.astro`, `src/pages/panduan.astro`, `src/pages/tentang.astro`, `src/pages/privacy-policy.astro`, `src/pages/404.astro`
- Create: `src/pages/auth/login.astro`, `src/pages/auth/register.astro`, `src/pages/auth/verifikasi.astro`, `src/pages/auth/reset-password.astro`

**Interfaces:**
- Consumes: `PublicLayout.astro`, `AuthLayout.astro`, `auth` store, `guide-topics.ts`.
- Produces: Complete editorial landing page (hero + Al-Fatihah preview, 5-stat bar, 3 pillars Membaca/Menghafal/Ibadah Harian incl. Tasbih, 6 feature cards, 3 steps, FAQ accordion, closing CTA, Teras Qur'an footer), searchable guide, about page with credits, transparent privacy policy (no madrasah text), and all 4 auth screens.

- [ ] **Step 1: Create `src/data/guide-topics.ts` and `LandingPreview.tsx` + `GuideFilter.tsx` + `AuthForms.tsx`**
- [ ] **Step 2: Create all 5 public `.astro` pages and 4 `/auth/*.astro` pages**
- [ ] **Step 3: Run `npx astro check`**
  Expected: 0 errors.
- [ ] **Step 4: Commit**
  Run: `git add src/data/guide-topics.ts src/components/public src/components/auth src/pages/index.astro src/pages/panduan.astro src/pages/tentang.astro src/pages/privacy-policy.astro src/pages/404.astro src/pages/auth && git commit -m "feat: add public landing, guide, about, privacy, 404, and auth pages"`

---

### Task 8: Al-Qur'an Module (Beranda App, Surah/Juz/Halaman/Manzil/Ruku/Sajda, Tajwid, Cari Ayat, Reader, Mushaf Page, Tafsir, Share Image)

**Files:**
- Create: `src/lib/quran/share-image.ts` (client-side HTML5 Canvas exporter: flat Terang/Gelap/Polos styles, Square 1080×1080 & Story 1080×1920, zero gradients, footer `Al-Qur'an Digital · Teras Qur'an`)
- Create: `src/components/quran/DashboardView.tsx`, `src/components/quran/SurahListView.tsx`, `src/components/quran/IndexViews.tsx` (Juz, Halaman, Manzil, Ruku, Sajda), `src/components/quran/TajwidView.tsx` (12 rules + interactive quiz), `src/components/quran/SearchView.tsx`, `src/components/quran/AyahCard.tsx` (with Tajwid tooltip, blur-to-reveal, full `⋮` menu, NoteSheet, CollectionSheet, HifzRangeDialog, ShareImageDialog), `src/components/quran/ReaderSettingsSheet.tsx`, `src/components/quran/SurahReaderView.tsx`, `src/components/quran/MushafPageView.tsx`, `src/components/quran/TafsirView.tsx`
- Create: `src/pages/app/index.astro`, `src/pages/app/surah.astro`, `src/pages/app/juz.astro`, `src/pages/app/halaman/index.astro`, `src/pages/app/halaman/[page].astro`, `src/pages/app/manzil.astro`, `src/pages/app/ruku.astro`, `src/pages/app/sajda.astro`, `src/pages/app/tajwid.astro`, `src/pages/app/cari.astro`, `src/pages/app/baca/[surahId].astro`, `src/pages/app/tafsir.astro`

**Interfaces:**
- Consumes: `AppLayout.astro`, `quran/api.ts`, `search-logic.ts`, `tajwid-parser.ts`, all stores from Task 5.
- Produces: Static pre-rendered routes for 114 surahs (`/app/baca/1`..`/app/baca/114`) and 604 mushaf pages (`/app/halaman/1`..`/app/halaman/604`), plus every Quran exploration, reading, audio, tajwid, search, and tafsir feature.

- [ ] **Step 1: Implement `share-image.ts`, `ReaderSettingsSheet.tsx`, and `AyahCard.tsx` (including Note, Collection, Hifz Range, and Share Image modals)**
- [ ] **Step 2: Implement `SurahReaderView.tsx`, `MushafPageView.tsx`, `TafsirView.tsx`, `DashboardView.tsx`, `SurahListView.tsx`, `IndexViews.tsx`, `TajwidView.tsx`, and `SearchView.tsx`**
- [ ] **Step 3: Create all 12 Astro pages under `src/pages/app/` (with `getStaticPaths` for `[surahId]` 1..114 and `[page]` 1..604)**
- [ ] **Step 4: Run `npx astro check`**
  Expected: 0 errors.
- [ ] **Step 5: Commit**
  Run: `git add src/lib/quran/share-image.ts src/components/quran src/pages/app && git commit -m "feat: implement full Al-Quran reading, mushaf, tafsir, tajwid, search, and dashboard module"`

---

### Task 9: Personal Module (Bacaanku, Tersimpan/Koleksi, Catatan, Surah Pilihan, Progres/Khatam, Hafalan SM-2, Sambung Ayat, Khataman Bersama)

**Files:**
- Create: `src/components/personal/LastReadView.tsx`, `src/components/personal/FavoritesView.tsx`, `src/components/personal/CollectionDetailView.tsx`, `src/components/personal/NotesView.tsx`, `src/components/personal/SavedSurahsView.tsx`, `src/components/personal/ProgressView.tsx`, `src/components/personal/HifzView.tsx`, `src/components/personal/SambungAyatView.tsx`, `src/components/personal/KhatamanListView.tsx`, `src/components/personal/KhatamanGroupView.tsx`
- Create: `src/pages/app/bacaanku.astro`, `src/pages/app/favorit.astro`, `src/pages/app/koleksi.astro`, `src/pages/app/catatan.astro`, `src/pages/app/surah-pilihan.astro`, `src/pages/app/progres.astro`, `src/pages/app/hafalan.astro`, `src/pages/app/sambung-ayat.astro`, `src/pages/app/khataman/index.astro`, `src/pages/app/khataman/grup.astro`

**Interfaces:**
- Consumes: `AppLayout.astro`, `AyahCard.tsx`, `library`/`progress`/`hifz`/`khataman`/`audio-player` stores, `sm2.ts`, `sambung-logic.ts`.
- Produces: Every authenticated & local-first personal screen matching the 7 `pribadi-*.png` reference screenshots (in Sapphire Blue flat styling).

- [ ] **Step 1: Implement `LastReadView.tsx`, `FavoritesView.tsx`, `CollectionDetailView.tsx`, `NotesView.tsx`, and `SavedSurahsView.tsx`**
- [ ] **Step 2: Implement `ProgressView.tsx` (daily goal dialog, 7-day ring strip, 30-juz grid, 30-day history, start new khatam), `HifzView.tsx` (Hari ini/Semua/Progres tabs, Murajaah SM-2 review modal, Bulk Surah/Juz import modal), `SambungAyatView.tsx`, `KhatamanListView.tsx`, and `KhatamanGroupView.tsx`**
- [ ] **Step 3: Create all 10 Astro pages under `src/pages/app/`**
- [ ] **Step 4: Run `npx astro check`**
  Expected: 0 errors.
- [ ] **Step 5: Commit**
  Run: `git add src/components/personal src/pages/app && git commit -m "feat: implement personal reading, notes, collections, progress, hifz, sambung ayat, and khataman"`

---

### Task 10: Ibadah Module (Jadwal Sholat, Kompas Kiblat, Tasbih Digital Custom, Asmaul Husna), Notifikasi & Pengaturan (6 Tabs)

**Files:**
- Create: `src/components/worship/LocationBar.tsx`, `src/components/worship/PrayerTimesView.tsx`, `src/components/worship/QiblaView.tsx`, `src/components/worship/TasbihView.tsx`, `src/components/worship/AsmaulHusnaView.tsx`
- Create: `src/components/settings/NotificationsView.tsx`, `src/components/settings/SettingsView.tsx` (6 tabs matching `pengaturan-*.png`: Profil, Akun, Tampilan + Offline Quran + Audio, Pengingat, Privasi without Madrasah, Zona Bahaya 3-step deletion)
- Create: `src/pages/app/sholat.astro`, `src/pages/app/kiblat.astro`, `src/pages/app/tasbih.astro`, `src/pages/app/asmaul-husna.astro`, `src/pages/app/notifikasi.astro`, `src/pages/app/pengaturan.astro`

**Interfaces:**
- Consumes: `AppLayout.astro`, worship libs (`prayer-times.ts`, `hijri.ts`, `qibla.ts`), `tasbih` store + `sound.ts` + `haptic.ts`, `asmaul-husna.ts`, `cities-id.ts`, `settings`/`auth`/`offline`/`reminders`/`notifications` stores.
- Produces: Full Ibadah suite including the flagship customizable **Tasbih Digital** (tap ring, Space/Enter shortcut, custom target 1–10.000 & presets 33/99/100/1000/∞, auto-next round vs stop, Ba'da Sholat 4-step sequence, custom dzikir CRUD, Web Audio click, haptics, wake lock, daily stats & history) + Notifications + 6-tab Settings.

- [ ] **Step 1: Implement `LocationBar.tsx`, `PrayerTimesView.tsx`, `QiblaView.tsx`, `AsmaulHusnaView.tsx`, and `TasbihView.tsx`**
- [ ] **Step 2: Implement `NotificationsView.tsx` and `SettingsView.tsx` (all 6 tabs matching screenshots, Sapphire accent, zero Madrasah references)**
- [ ] **Step 3: Create all 6 Astro pages under `src/pages/app/`**
- [ ] **Step 4: Run `npx astro check`**
  Expected: 0 errors.
- [ ] **Step 5: Commit**
  Run: `git add src/components/worship src/components/settings src/pages/app && git commit -m "feat: implement prayer times, qibla, custom tasbih digital, asmaul husna, notifications, and settings"`

---

### Task 11: Full Verification, Anti AI Slop Audit, Build & Live Local Inspection

**Files:**
- Verify: entire workspace (`src/`, `public/`, `dist/`, `PRD.md`, `.env.example`, `firestore.rules`)

- [ ] **Step 1: Run all automated tests, typecheck, and production build**
  Run: `npx vitest run && npx astro check && npm run build`
  Expected: All unit tests PASS, 0 Astro/TS errors, `dist/` built cleanly with all static pages.
- [ ] **Step 2: Run Anti AI Slop & Branding Audit script**
  Verify via search across `src/` and `public/manifest.webmanifest` / `public/favicon.svg`:
  - Zero occurrences of `linear-gradient`, `radial-gradient`, `conic-gradient`, `bg-gradient-`.
  - Zero UI emoji characters in `src/`.
  - Zero occurrences of `Kelas Pondok` or `Eko Sutrisno` or `madrasah` in `src/`.
  - Exact presence of `Teras Qur'an` and `Al-Qur'an Digital oleh` + `document.write(new Date().getFullYear())` + `Cecep Maulanaツ.` in `PublicLayout.astro` and built `dist/index.html`.
- [ ] **Step 3: Smoke test built site routes locally**
  Start preview server (`npx astro preview --port 4321`) briefly and verify HTTP 200 and expected rendered HTML on `/`, `/panduan`, `/tentang`, `/privacy-policy`, `/auth/login`, `/app`, `/app/surah`, `/app/baca/1`, `/app/halaman/1`, `/app/tafsir`, `/app/tajwid`, `/app/cari`, `/app/bacaanku`, `/app/favorit`, `/app/catatan`, `/app/surah-pilihan`, `/app/progres`, `/app/hafalan`, `/app/sambung-ayat`, `/app/khataman`, `/app/sholat`, `/app/kiblat`, `/app/tasbih`, `/app/asmaul-husna`, `/app/notifikasi`, `/app/pengaturan`. Stop preview server when done.
- [ ] **Step 4: Final commit (if any polish fixes were made)**
  Run: `git status`
  Expected: Clean working tree.
