import {
  BookHeart,
  BookOpen,
  Bookmark,
  CircleDot,
  Clock,
  Compass,
  FileText,
  Heart,
  House,
  Layers,
  Library,
  LifeBuoy,
  Milestone,
  NotebookPen,
  Search,
  Settings,
  Shuffle,
  Sparkles,
  Speech,
  Star,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-preact';
import type { ComponentType } from 'preact';

export interface NavItemDef {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ class?: string }>;
  matchPrefixes?: string[];
}

export interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const NAV_GROUPS: readonly NavGroupDef[] = [
  {
    title: "AL-QUR'AN",
    items: [
      { href: '/app', label: 'Beranda', description: 'Ringkasan dan bacaan harian', icon: House },
      {
        href: '/app/surah',
        label: 'Surah',
        description: '114 surah',
        icon: BookOpen,
        matchPrefixes: ['/app/baca/', '/app/tafsir'],
      },
      { href: '/app/juz', label: 'Juz', description: '30 juz', icon: Layers },
      {
        href: '/app/halaman',
        label: 'Halaman',
        description: '604 halaman mushaf',
        icon: FileText,
        matchPrefixes: ['/app/halaman/'],
      },
      { href: '/app/manzil', label: 'Manzil', description: '7 manzil', icon: Milestone },
      { href: '/app/ruku', label: 'Ruku', description: '556 ruku', icon: Library },
      { href: '/app/sajda', label: 'Sajda', description: '15 ayat sajdah', icon: Sparkles },
      { href: '/app/tajwid', label: 'Tajwid', description: 'Hukum bacaan & latihan', icon: Speech },
      { href: '/app/cari', label: 'Cari ayat', description: 'Kata atau nomor ayat', icon: Search },
    ],
  },
  {
    title: 'PRIBADI',
    items: [
      { href: '/app/bacaanku', label: 'Bacaanku', description: 'Lanjutkan bacaan terakhir', icon: Bookmark },
      {
        href: '/app/favorit',
        label: 'Tersimpan',
        description: 'Ayat favorit & koleksi',
        icon: Heart,
        matchPrefixes: ['/app/koleksi'],
      },
      { href: '/app/catatan', label: 'Catatan', description: 'Catatan pribadi pada ayat', icon: NotebookPen },
      { href: '/app/surah-pilihan', label: 'Surah pilihan', description: 'Koleksi surah berbintang', icon: Star },
      { href: '/app/progres', label: 'Progres', description: 'Target, streak, khatam', icon: TrendingUp },
      {
        href: '/app/hafalan',
        label: 'Hafalan',
        description: 'Hafalan & murajaah',
        icon: BookHeart,
        matchPrefixes: ['/app/sambung-ayat'],
      },
      {
        href: '/app/khataman',
        label: 'Khataman',
        description: 'Khatam bersama 30 juz',
        icon: Users,
        matchPrefixes: ['/app/khataman/'],
      },
    ],
  },
  {
    title: 'IBADAH',
    items: [
      { href: '/app/sholat', label: 'Jadwal sholat', description: 'Waktu sholat & imsak', icon: Clock },
      { href: '/app/kiblat', label: 'Kiblat', description: 'Arah kiblat & kompas', icon: Compass },
      { href: '/app/tasbih', label: 'Tasbih', description: 'Dzikir & hitungan kustom', icon: CircleDot },
      { href: '/app/asmaul-husna', label: 'Asmaul Husna', description: '99 nama Allah', icon: Sun },
    ],
  },
];

export const BOTTOM_SIDEBAR_ITEMS: readonly NavItemDef[] = [
  { href: '/panduan', label: 'Panduan', description: 'Cara memakai setiap fitur', icon: LifeBuoy },
  { href: '/app/pengaturan', label: 'Pengaturan', description: 'Profil, tampilan, audio, privasi', icon: Settings },
];

export interface MobileNavGroupDef {
  id: 'beranda' | 'quran' | 'pribadi' | 'ibadah' | 'pengaturan';
  label: string;
  title: string;
  icon: ComponentType<{ class?: string }>;
  href?: string;
  items?: readonly NavItemDef[];
}

export const MOBILE_NAV_GROUPS: readonly MobileNavGroupDef[] = [
  {
    id: 'beranda',
    label: 'Beranda',
    title: 'Beranda',
    icon: House,
    href: '/app',
  },
  {
    id: 'quran',
    label: "Al-Qur'an",
    title: "Al-Qur'an",
    icon: BookOpen,
    items: NAV_GROUPS[0].items.filter((it) => it.href !== '/app'),
  },
  {
    id: 'pribadi',
    label: 'Pribadi',
    title: 'Pribadi',
    icon: Bookmark,
    items: [
      ...NAV_GROUPS[1].items.map((item) =>
        item.href === '/app/hafalan' ? { ...item, matchPrefixes: undefined } : item
      ),
      {
        href: '/app/sambung-ayat',
        label: 'Sambung ayat',
        description: 'Latihan tebak lanjutan ayat',
        icon: Shuffle,
      },
    ],
  },
  {
    id: 'ibadah',
    label: 'Ibadah',
    title: 'Ibadah',
    icon: Compass,
    items: NAV_GROUPS[2].items,
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    title: 'Pengaturan',
    icon: Settings,
    href: '/app/pengaturan',
  },
];

export function isMobileGroupActive(group: MobileNavGroupDef, pathname: string): boolean {
  if (group.href) {
    const clean = pathname.replace(/\/+$/, '') || '/';
    const target = group.href.replace(/\/+$/, '') || '/';
    return clean === target;
  }
  return Boolean(group.items?.some((item) => isNavItemActive(item, pathname)));
}

export const ALL_NAV_ITEMS: readonly NavItemDef[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  ...BOTTOM_SIDEBAR_ITEMS,
];

export function isNavItemActive(item: NavItemDef, pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const target = item.href.replace(/\/+$/, '') || '/';
  if (clean === target) return true;
  if (item.matchPrefixes?.some((p) => clean.startsWith(p))) return true;
  return false;
}
