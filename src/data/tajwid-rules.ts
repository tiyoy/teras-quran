import type { TajwidGroup } from '@/lib/quran/tajwid-parser';

export interface TajwidRuleInfo {
  id: TajwidGroup;
  cssClass: string;
  name: string;
  shortDesc: string;
  howToRead: string;
  letters: string;
  examples: Array<{ surahId: number; ayahNumber: number; label: string }>;
}

export const TAJWID_RULES: readonly TajwidRuleInfo[] = [
  {
    id: 'ghunnah',
    cssClass: 'tajwid-ghunnah',
    name: 'Gunnah',
    shortDesc: 'Nun atau mim bertasydid, didengungkan 2 harakat.',
    howToRead: 'Tahan bunyi dengung dari pangkal hidung (khaisyum) sepanjang 2 harakat sebelum melafalkan vokal huruf berikutnya.',
    letters: 'نّ ، مّ',
    examples: [
      { surahId: 114, ayahNumber: 1, label: 'An-Nas: 1' },
      { surahId: 108, ayahNumber: 1, label: 'Al-Kautsar: 1' },
    ],
  },
  {
    id: 'ikhfa',
    cssClass: 'tajwid-ikhfa',
    name: 'Ikhfa dan Ikhfa Syafawi',
    shortDesc: 'Nun mati/tanwin (atau mim mati sebelum ba) dibaca samar dengan dengung.',
    howToRead: 'Samarkan bunyi nun mati/tanwin di antara izhar dan idgham disertai dengung 2 harakat, bersiap menuju makhraj huruf berikutnya.',
    letters: 'ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك (dan ب untuk mim mati)',
    examples: [
      { surahId: 113, ayahNumber: 2, label: 'Al-Falaq: 2' },
      { surahId: 105, ayahNumber: 4, label: 'Al-Fil: 4' },
    ],
  },
  {
    id: 'idghamBigunnah',
    cssClass: 'tajwid-idgham-bigunnah',
    name: 'Idgham Bigunnah dan Idgham Mimi',
    shortDesc: 'Dilebur ke huruf sesudahnya dengan dengung 2 harakat.',
    howToRead: 'Masukkan bunyi nun mati/tanwin ke huruf ي ن م و (atau mim mati ke mim) dengan dengung yang jelas.',
    letters: 'ي ن م و (dan م setelah مْ)',
    examples: [
      { surahId: 111, ayahNumber: 1, label: 'Al-Lahab: 1' },
      { surahId: 99, ayahNumber: 7, label: 'Az-Zalzalah: 7' },
    ],
  },
  {
    id: 'idghamBilagunnah',
    cssClass: 'tajwid-idgham-bilagunnah',
    name: 'Idgham Bilagunnah',
    shortDesc: 'Nun mati atau tanwin sebelum lam atau ra, dilebur tanpa dengung.',
    howToRead: 'Leburkan bunyi nun mati/tanwin sepenuhnya ke huruf ل atau ر tanpa menahan dengung.',
    letters: 'ل ، ر',
    examples: [
      { surahId: 112, ayahNumber: 4, label: 'Al-Ikhlas: 4' },
      { surahId: 104, ayahNumber: 1, label: 'Al-Humazah: 1' },
    ],
  },
  {
    id: 'idghamMutajanisain',
    cssClass: 'tajwid-idgham-mutajanisain',
    name: 'Idgham Mutajanisain dan Mutaqaribain',
    shortDesc: 'Huruf mati dilebur ke huruf sesudahnya yang sejenis atau dekat makhrajnya.',
    howToRead: 'Masukkan bunyi huruf sukun pertama langsung ke huruf kedua bertasydid tanpa membunyikan huruf pertama.',
    letters: 'د→ت ، ت→د ، ت→ط ، ذ→ظ ، ل→ر ، ق→ك',
    examples: [
      { surahId: 109, ayahNumber: 4, label: 'Al-Kafirun: 4' },
      { surahId: 2, ayahNumber: 256, label: 'Al-Baqarah: 256' },
    ],
  },
  {
    id: 'iqlab',
    cssClass: 'tajwid-iqlab',
    name: 'Iqlab',
    shortDesc: 'Nun mati atau tanwin sebelum ba, dibaca mim dengan dengung.',
    howToRead: 'Ubah bunyi nun mati/tanwin menjadi bunyi mim yang ringan dengan dengung 2 harakat saat bertemu huruf ب.',
    letters: 'ب (setelah نْ / tanwin)',
    examples: [
      { surahId: 104, ayahNumber: 4, label: 'Al-Humazah: 4' },
      { surahId: 98, ayahNumber: 4, label: 'Al-Bayyinah: 4' },
    ],
  },
  {
    id: 'qalqalah',
    cssClass: 'tajwid-qalqalah',
    name: 'Qalqalah',
    shortDesc: 'Huruf qaf, tha, ba, jim, atau dal yang mati dibaca memantul.',
    howToRead: 'Pantulkan suara huruf saat sukun di tengah kata (Sugra) atau lebih kuat ketika waqaf di akhir ayat (Kubra).',
    letters: 'ق ط ب ج د',
    examples: [
      { surahId: 112, ayahNumber: 1, label: 'Al-Ikhlas: 1' },
      { surahId: 113, ayahNumber: 1, label: 'Al-Falaq: 1' },
    ],
  },
  {
    id: 'madThabii',
    cssClass: 'tajwid-mad-thabii',
    name: "Mad Thabi'i",
    shortDesc: 'Dibaca panjang 2 harakat.',
    howToRead: 'Panjangkan bacaan tepat 2 harakat (1 alif) ketika fathah bertemu alif, kasrah bertemu ya sukun, atau dammah bertemu wawu sukun.',
    letters: 'ا ، و ، ي',
    examples: [
      { surahId: 1, ayahNumber: 1, label: 'Al-Fatihah: 1' },
      { surahId: 1, ayahNumber: 4, label: 'Al-Fatihah: 4' },
    ],
  },
  {
    id: 'madWajibJaiz',
    cssClass: 'tajwid-mad-wajib-jaiz',
    name: 'Mad Wajib Muttasil dan Jaiz Munfasil',
    shortDesc: 'Dibaca panjang 4 atau 5 harakat.',
    howToRead: 'Panjangkan 4–5 harakat saat huruf mad bertemu hamzah dalam satu kata (Wajib Muttasil) atau di awal kata berikutnya (Jaiz Munfasil).',
    letters: 'Huruf mad + ء',
    examples: [
      { surahId: 110, ayahNumber: 1, label: 'An-Nasr: 1' },
      { surahId: 108, ayahNumber: 1, label: 'Al-Kautsar: 1' },
    ],
  },
  {
    id: 'madArid',
    cssClass: 'tajwid-mad-arid',
    name: "Mad 'Arid Lissukun dan Mad Lin",
    shortDesc: 'Saat berhenti (waqaf), dibaca panjang 2, 4, atau 6 harakat.',
    howToRead: 'Panjangkan secara konsisten (umumnya 4 harakat) pada huruf mad sebelum huruf terakhir yang disukunkan karena berhenti.',
    letters: 'Mad sebelum huruf waqaf',
    examples: [
      { surahId: 1, ayahNumber: 2, label: 'Al-Fatihah: 2' },
      { surahId: 106, ayahNumber: 1, label: 'Quraisy: 1' },
    ],
  },
  {
    id: 'madLazim',
    cssClass: 'tajwid-mad-lazim',
    name: 'Mad Lazim',
    shortDesc: 'Dibaca panjang 6 harakat secara wajib.',
    howToRead: 'Panjangkan penuh 6 harakat ketika huruf mad bertemu tasydid atau sukun asli (termasuk huruf muqatta’ah di awal surah).',
    letters: 'Mad + tasydid / sukun asli',
    examples: [
      { surahId: 1, ayahNumber: 7, label: 'Al-Fatihah: 7' },
      { surahId: 2, ayahNumber: 1, label: 'Al-Baqarah: 1' },
    ],
  },
  {
    id: 'silent',
    cssClass: 'tajwid-silent',
    name: 'Tidak Dibaca',
    shortDesc: 'Hamzah wasal, lam syamsiyah, dan huruf tertulis yang tidak dilafalkan.',
    howToRead: 'Lewati pelafalan huruf yang ditandai abu-abu saat menyambung bacaan (wasal).',
    letters: 'ٱ (hamzah wasal), ل syamsiyah, ا ziyadah',
    examples: [
      { surahId: 1, ayahNumber: 1, label: 'Al-Fatihah: 1' },
      { surahId: 1, ayahNumber: 6, label: 'Al-Fatihah: 6' },
    ],
  },
];

export const TAJWID_RULE_MAP: Record<TajwidGroup, TajwidRuleInfo> = Object.fromEntries(
  TAJWID_RULES.map((r) => [r.id, r])
) as Record<TajwidGroup, TajwidRuleInfo>;
