export interface GuideTopic {
  id: string;
  category: 'Membaca' | 'Audio & Offline' | 'Pribadi & Hafalan' | 'Ibadah & Tasbih' | 'Akun & Privasi';
  title: string;
  summary: string;
  steps: string[];
  notes?: string[];
}

export const GUIDE_TOPICS: readonly GuideTopic[] = [
  {
    id: 'membaca-alquran',
    category: 'Membaca',
    title: 'Membaca Al-Qur’an per Surah, Juz, dan Halaman Mushaf',
    summary: 'Buka bacaan dari indeks 114 surah, 30 juz, 604 halaman standar Madinah, 7 manzil, 556 ruku, atau 15 ayat sajdah.',
    steps: [
      'Pilih menu Surah, Juz, atau Halaman pada bilah sisi (atau tekan Ctrl+K untuk lompat cepat).',
      'Di halaman baca, gunakan tombol Tampilan di bagian atas untuk beralih antara mode Kartu per ayat dan mode Halaman Mushaf.',
      'Ketuk ikon Pengaturan Tampilan untuk mengubah ukuran teks Arab (22–44px), menampilkan transliterasi, mengganti bahasa terjemahan (Indonesia/English), atau menyalakan Warna Tajwid.',
    ],
    notes: ['Membaca tidak membutuhkan akun. Semua preferensi tampilan otomatis tersimpan di perangkat ini.'],
  },
  {
    id: 'tajwid-dan-tafsir',
    category: 'Membaca',
    title: 'Warna Tajwid, Latihan Tajwid, dan Tafsir Kemenag RI',
    summary: 'Pelajari 12 hukum tajwid berwarna serta baca Tafsir Ringkas (Wajiz) dan Lengkap (Tahlili) pada setiap ayat.',
    steps: [
      'Aktifkan sakelar Warna Tajwid di Pengaturan Tampilan untuk melihat kode 12 warna pada teks Arab.',
      'Di desktop, arahkan kursor ke bagian huruf berwarna untuk melihat nama dan cara baca hukum tajwidnya.',
      'Buka menu Tajwid di sidebar untuk mempelajari setiap hukum beserta contoh audio dan mengikuti Latihan tebak hukum tajwid.',
      'Untuk membaca tafsir suatu ayat, ketuk tombol menu (⋮) pada ayat lalu pilih "Buka tafsir".',
    ],
    notes: ['Warna tajwid dibuat secara otomatis sebagai alat bantu belajar. Tetap pastikan kebenaran bacaan bersama guru atau ustadz.'],
  },
  {
    id: 'pencarian-pintar',
    category: 'Membaca',
    title: 'Mencari Kata atau Langsung Lompat ke Ayat',
    summary: 'Cari kata dalam terjemahan Indonesia, Inggris, teks Arab (tanpa perlu harakat), atau bacaan latin.',
    steps: [
      'Buka halaman Cari Ayat, lalu ketik minimal 3 huruf kata yang ingin dicari.',
      'Gunakan tanda kutip ganda (mis. "sabar dan shalat") untuk mencari frasa persis.',
      'Untuk melompat langsung ke ayat tertentu, ketik referensi seperti 2:255, QS 18:10, atau yasin 1 lalu tekan Enter.',
    ],
  },
  {
    id: 'audio-murottal',
    category: 'Audio & Offline',
    title: 'Pemutar Murottal, Pengulangan Hafalan, dan Unduh Offline',
    summary: 'Dengarkan 8 pilihan qari (Murattal & Mujawwad) dengan pengulangan ayat, pengulangan rentang, jeda talaqqi, dan timer tidur.',
    steps: [
      'Ketuk tombol Putar pada header surah atau pada kartu ayat mana pun. Pemutar audio di bagian bawah tetap aktif walau kamu berpindah halaman.',
      'Ketuk tombol Opsi Audio pada pemutar untuk mengganti qari, mengatur kecepatan (0.75x–1.5x), mengulang satu ayat (2x/3x/5x/tanpa batas), atau mengulang rentang ayat tertentu.',
      'Atur Jeda antar ayat menjadi "Sepanjang ayat" untuk menirukan bacaan qari setelah setiap ayat selesai.',
      'Ketuk "Unduh surah ini" di Opsi Audio untuk menyimpan murottal surah di perangkat agar bisa diputar tanpa internet.',
    ],
  },
  {
    id: 'alquran-offline',
    category: 'Audio & Offline',
    title: 'Menyimpan Seluruh Teks Al-Qur’an untuk Dibaca Offline',
    summary: 'Simpan seluruh 114 surah ke Cache perangkat agar tetap dapat dibuka saat sinyal lemah atau mode pesawat.',
    steps: [
      'Buka Pengaturan → tab Tampilan, lalu gulir ke kartu "Al-Qur’an offline".',
      'Ketuk "Simpan Al-Qur’an" dan tunggu hingga seluruh berkas selesai disimpan.',
      'Kamu dapat menghapus data offline kapan saja dari kartu yang sama untuk menghemat ruang penyimpanan.',
    ],
  },
  {
    id: 'catatan-koleksi',
    category: 'Pribadi & Hafalan',
    title: 'Bacaan Terakhir, Favorit, Koleksi, dan Catatan Ayat',
    summary: 'Simpan penanda tilawah, kumpulkan ayat favorit ke koleksi bertema, dan tulis renungan pribadi.',
    steps: [
      'Ketuk ikon hati pada ayat untuk menyimpannya di Tersimpan → Favorit.',
      'Buka menu (⋮) pada ayat untuk menandai "Tandai bacaan terakhir", menulis "Catatan", atau memilih "Tambah ke koleksi" (mis. Doa, Ayat Harian).',
      'Di halaman detail Koleksi, tekan "Putar semua" untuk mendengarkan seluruh ayat dalam koleksi secara berurutan.',
    ],
  },
  {
    id: 'progres-khatam',
    category: 'Pribadi & Hafalan',
    title: 'Target Harian, Hari Beruntun, dan Pelacakan Khatam',
    summary: 'Pantau konsistensi tilawah harian dan kemajuan membaca 30 juz menuju khatam.',
    steps: [
      'Buka menu Progres, lalu tekan "Atur target" untuk menentukan target harian (ayat, halaman, atau juz) serta tanggal target khatam opsional.',
      'Saat kamu membaca ayat atau menyelesaikan pemutaran audio, progres harian dan grid 30 juz tercatat otomatis.',
      'Setelah mencapai 100% atau ingin memulai siklus baru, tekan "Mulai khatam baru".',
    ],
  },
  {
    id: 'hafalan-murajaah',
    category: 'Pribadi & Hafalan',
    title: 'Hafalan, Jadwal Murajaah Otomatis, dan Latihan Sambung Ayat',
    summary: 'Catat rentang ayat yang telah dihafal agar sistem menjadwalkan murajaah dengan metode pengulangan berjarak (SM-2).',
    steps: [
      'Tandai hafalan lewat menu (⋮) pada ayat → "Tandai hafalan", atau buka halaman Hafalan → "Tandai surah/juz" untuk menandai satu surah atau juz sekaligus.',
      'Setiap hari, buka tab "Hari ini" di halaman Hafalan lalu tekan "Mulai murajaah". Uji hafalanmu dan beri nilai: Lupa, Sulit, Lancar, atau Sangat lancar.',
      'Gunakan tombol "Latihan sambung ayat" untuk berlatih melanjutkan ayat secara acak dari surah pilihan atau dari daftar hafalanmu.',
    ],
  },
  {
    id: 'khataman-bersama',
    category: 'Pribadi & Hafalan',
    title: 'Khataman Bersama 30 Juz',
    summary: 'Buat grup khataman bersama keluarga atau teman — setiap anggota mengambil jatah juz masing-masing.',
    steps: [
      'Buka menu Khataman, masukkan nama grup (mis. ODOJ Keluarga), lalu tekan "Buat khataman".',
      'Bagikan tautan grup kepada keluarga atau teman agar mereka bisa bergabung dan memilih juz yang masih kosong.',
      'Tandai "Selesai" setelah menuntaskan juz bagianmu. Setelah ke-30 juz selesai, tekan "Mulai putaran baru".',
    ],
  },
  {
    id: 'jadwal-sholat-kiblat',
    category: 'Ibadah & Tasbih',
    title: 'Jadwal Sholat Kemenag RI, Kalender Hijriah, dan Kompas Kiblat',
    summary: 'Hitung jadwal sholat dan arah kiblat langsung di perangkat tanpa mengirim lokasi ke server.',
    steps: [
      'Buka Jadwal Sholat atau Kiblat, lalu pilih "Gunakan lokasi saya" (GPS) atau "Pilih kota" dari daftar kota/kabupaten Indonesia.',
      'Di Jadwal Sholat, lihat hitung mundur sholat berikutnya, jadwal bulanan lengkap, serta sesuaikan tanggal Hijriah (-2 sampai +2 hari) sesuai penetapan rukyat.',
      'Di halaman Kiblat, ketuk "Aktifkan kompas" pada ponsel untuk memutar dial kompas secara langsung mengikuti arah perangkatmu.',
    ],
  },
  {
    id: 'tasbih-digital',
    category: 'Ibadah & Tasbih',
    title: 'Tasbih Digital & Custom Jumlah Dzikir',
    summary: 'Hitung dzikir dengan satu sentuhan, target hitungan kustom, rangkaian dzikir ba’da sholat, dan umpan balik suara/getar.',
    steps: [
      'Buka menu Ibadah → Tasbih, pilih bacaan dzikir yang diinginkan atau aktifkan mode rangkaian "Dzikir Ba’da Sholat" (33→33→33→1 otomatis).',
      'Pilih target cepat (33, 99, 100, 1000, Tanpa batas) atau masukkan angka target custom berapa pun (1 sampai 10.000).',
      'Ketuk lingkaran besar di tengah layar (atau tekan Spasi di keyboard) untuk menambah hitungan. Gunakan tombol -1 jika kelebihan ketuk.',
      'Tekan "Tambah dzikir" untuk membuat bacaan dzikir custom milikmu sendiri lengkap dengan teks Arab, latin, arti, dan target masing-masing.',
    ],
    notes: ['Suara klik dihasilkan langsung oleh browser (tanpa unduhan audio) dan bisa dimatikan kapan saja, begitu pula getaran haptik.'],
  },
  {
    id: 'akun-privasi',
    category: 'Akun & Privasi',
    title: 'Sinkronisasi Akun, Ekspor Data, dan Hapus Akun',
    summary: 'Data bacaanmu tetap milikmu — dapat diunduh sebagai berkas JSON atau dihapus permanen kapan saja.',
    steps: [
      'Masuk dengan Google atau Email di halaman Masuk agar bacaan terakhir, favorit, koleksi, catatan, progres, hafalan, dan tasbih tersinkronisasi antar perangkat.',
      'Buka Pengaturan → tab Akun atau Privasi → "Unduh data saya" untuk menyimpan cadangan data pribadimu dalam format JSON.',
      'Untuk menghapus akun dan seluruh data secara permanen, buka Pengaturan → tab Zona bahaya dan ikuti 3 langkah konfirmasi.',
    ],
  },
];
