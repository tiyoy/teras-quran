export interface TasbihPreset {
  id: string;
  title: string;
  arabic: string;
  latin: string;
  meaning: string;
  target: number; // 0 means unlimited
  isDefault?: boolean;
}

export const DEFAULT_TASBIH_PRESETS: readonly TasbihPreset[] = [
  {
    id: 'subhanallah',
    title: 'Subhanallah',
    arabic: 'سُبْحَانَ اللّٰهِ',
    latin: 'Subḥānallāh',
    meaning: 'Maha Suci Allah',
    target: 33,
    isDefault: true,
  },
  {
    id: 'alhamdulillah',
    title: 'Alhamdulillah',
    arabic: 'اَلْحَمْدُ لِلّٰهِ',
    latin: 'Al-ḥamdu lillāh',
    meaning: 'Segala puji bagi Allah',
    target: 33,
    isDefault: true,
  },
  {
    id: 'allahuakbar',
    title: 'Allahu Akbar',
    arabic: 'اَللّٰهُ أَكْبَرُ',
    latin: 'Allāhu akbar',
    meaning: 'Allah Maha Besar',
    target: 33,
    isDefault: true,
  },
  {
    id: 'tahlil',
    title: 'Tahlil',
    arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيْكَ لَهُ',
    latin: 'Lā ilāha illallāhu waḥdahū lā syarīka lah',
    meaning: 'Tiada Tuhan selain Allah Yang Maha Esa, tiada sekutu bagi-Nya',
    target: 100,
    isDefault: true,
  },
  {
    id: 'istighfar',
    title: 'Istighfar',
    arabic: 'أَسْتَغْفِرُ اللّٰهَ الْعَظِيْمَ',
    latin: "Astaghfirullāhal-'aẓīm",
    meaning: 'Aku memohon ampun kepada Allah Yang Maha Agung',
    target: 100,
    isDefault: true,
  },
  {
    id: 'shalawat',
    title: 'Shalawat Nabi',
    arabic: 'اَللّٰهُمَّ صَلِّ عَلٰى سَيِّدِنَا مُحَمَّدٍ',
    latin: 'Allāhumma ṣalli ‘alā sayyidinā Muḥammad',
    meaning: 'Ya Allah, limpahkanlah rahmat kepada junjungan kami Nabi Muhammad',
    target: 100,
    isDefault: true,
  },
  {
    id: 'tasbih-yunus',
    title: 'Tasbih Nabi Yunus',
    arabic: 'لَا إِلٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّيْ كُنْتُ مِنَ الظَّالِمِيْنَ',
    latin: 'Lā ilāha illā anta subḥānaka innī kuntu minaẓ-ẓālimīn',
    meaning: 'Tiada Tuhan selain Engkau, Maha Suci Engkau, sungguh aku termasuk orang yang zalim',
    target: 40,
    isDefault: true,
  },
];

export interface BadaSholatStep {
  id: string;
  title: string;
  arabic: string;
  latin: string;
  meaning: string;
  target: number;
}

export const BADA_SHOLAT_STEPS: readonly BadaSholatStep[] = [
  {
    id: 'bs-subhanallah',
    title: 'Subhanallah',
    arabic: 'سُبْحَانَ اللّٰهِ',
    latin: 'Subḥānallāh',
    meaning: 'Maha Suci Allah',
    target: 33,
  },
  {
    id: 'bs-alhamdulillah',
    title: 'Alhamdulillah',
    arabic: 'اَلْحَمْدُ لِلّٰهِ',
    latin: 'Al-ḥamdu lillāh',
    meaning: 'Segala puji bagi Allah',
    target: 33,
  },
  {
    id: 'bs-allahuakbar',
    title: 'Allahu Akbar',
    arabic: 'اَللّٰهُ أَكْبَرُ',
    latin: 'Allāhu akbar',
    meaning: 'Allah Maha Besar',
    target: 33,
  },
  {
    id: 'bs-tahlil',
    title: 'Tahlil Penutup',
    arabic:
      'لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيْكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلٰى كُلِّ شَيْءٍ قَدِيْرٌ',
    latin:
      'Lā ilāha illallāhu waḥdahū lā syarīka lah, lahul-mulku wa lahul-ḥamdu wa huwa ‘alā kulli syai’in qadīr',
    meaning:
      'Tiada Tuhan selain Allah Yang Esa tiada sekutu bagi-Nya, bagi-Nya kerajaan dan segala puji, dan Dia Maha Kuasa atas segala sesuatu',
    target: 1,
  },
];

export const QUICK_TARGETS: readonly number[] = [33, 99, 100, 1000, 0];
