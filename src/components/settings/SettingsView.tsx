import { useEffect, useState } from 'preact/hooks';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Lock,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  User,
} from 'lucide-preact';
import { authUser, isFirebaseConfigured, userInitials, userProfile } from '@/stores/auth';
import { locale, setLocale } from '@/stores/locale';
import { setThemeMode, themeMode } from '@/stores/theme';
import {
  ARABIC_SIZE_LIMITS,
  LATIN_SIZE_LIMITS,
  TRANSLATION_SIZE_LIMITS,
  readerSettings,
  resetReaderSettings,
  updateReaderSettings,
} from '@/stores/reader-settings';
import {
  canInstallPwa,
  isIosSafari,
  isStandalonePwa,
  promptPwaInstall,
} from '@/stores/pwa';
import {
  audioPrefs,
  downloadedSurahs,
  removeAllAudioDownloads,
  updateAudioPrefs,
} from '@/stores/audio-player';
import {
  autoOfflineStatus,
  cancelOfflineQuran,
  estimateFreeSpaceMB,
  inspectOfflineStatus,
  offlineJob,
  offlineQuranMeta,
  removeOfflineQuran,
  saveOfflineQuran,
  triggerAutoOfflineWarm,
} from '@/stores/offline';
import {
  disableDailyReminder,
  enableDailyReminder,
  reminderSettings,
  sendTestReminder,
  updateReminderSettings,
} from '@/stores/reminders';
import { RECITERS } from '@/data/reciters';
import {
  changeAccountPassword,
  deleteCurrentFirebaseUser,
  logoutAccount,
  mapAuthError,
  reauthenticateUser,
  requestEmailChange,
  resendVerification,
  updateDisplayName,
} from '@/lib/firebase/auth';
import {
  deleteAllFirestoreUserData,
  exportFirestoreUserData,
  upsertUserProfile,
} from '@/lib/firebase/firestore';
import { showToast } from '@/stores/toast';
import { clearLocalUserSessionData } from '@/stores/sync';
import { AuthGateSkeleton, useAuthGate } from '@/components/auth/LoginRequired';
import { Badge, Button, Card, Modal, PageHeader, Switch } from '@/components/ui/Primitives';

type SettingsTab = 'profil' | 'akun' | 'tampilan' | 'pengingat' | 'privasi' | 'bahaya';

const TABS: Array<{ id: SettingsTab; label: string; icon: typeof User }> = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'akun', label: 'Akun', icon: Shield },
  { id: 'tampilan', label: 'Tampilan', icon: Palette },
  { id: 'pengingat', label: 'Pengingat', icon: Bell },
  { id: 'privasi', label: 'Privasi', icon: Lock },
  { id: 'bahaya', label: 'Zona bahaya', icon: AlertTriangle },
];

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>('profil');
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [freeSpaceMB, setFreeSpaceMB] = useState<number | null>(null);

  // Account password/email change
  const [newEmail, setNewEmail] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Danger zone 3-step modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1);
  const [reauthPw, setReauthPw] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [clearDevice, setClearDevice] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const authGate = useAuthGate();
  const user = authUser.value;
  const signedIn = authGate === 'authenticated' && Boolean(user);
  const profile = userProfile.value;
  const rs = readerSettings.value;
  const rem = reminderSettings.value;
  const offMeta = offlineQuranMeta.value;
  const offJob = offlineJob.value;

  useEffect(() => {
    setFullName(profile?.displayName || user?.displayName || '');
  }, [profile?.displayName, user?.displayName]);

  useEffect(() => {
    estimateFreeSpaceMB().then(setFreeSpaceMB).catch(() => {});
  }, []);

  const hasPasswordProvider = Boolean(
    user?.providerData.some((p) => p.providerId === 'password')
  );
  const isGoogleOnly = Boolean(
    user && !hasPasswordProvider && user.providerData.some((p) => p.providerId === 'google.com')
  );

  async function saveProfile(e: Event) {
    e.preventDefault();
    if (!user || !fullName.trim()) return;
    setSavingProfile(true);
    try {
      const nextName = fullName.trim();
      await updateDisplayName(nextName);
      await upsertUserProfile(user.uid, { displayName: nextName });
      userProfile.value = { ...(userProfile.value ?? {}), displayName: nextName };
      showToast('Profil berhasil disimpan.', { variant: 'success' });
    } catch (err) {
      showToast(mapAuthError(err), { variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function exportMyData() {
    try {
      const localDump: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('tq:')) {
          try {
            localDump[k] = JSON.parse(localStorage.getItem(k) || 'null');
          } catch {
            localDump[k] = localStorage.getItem(k);
          }
        }
      }
      const cloudDump = user ? await exportFirestoreUserData(user.uid) : null;
      const payload = {
        exportedAt: new Date().toISOString(),
        app: "Al-Qur'an Digital — Teras Qur'an",
        account: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null,
        cloud: cloudDump,
        device: localDump,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teras-quran-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data kamu sudah diunduh.', { variant: 'success' });
    } catch {
      showToast('Data gagal diunduh. Coba lagi.', { variant: 'error' });
    }
  }

  async function executeAccountDelete() {
    if (confirmWord.trim() !== 'HAPUS') return;
    setDeleting(true);
    try {
      if (user) {
        await deleteAllFirestoreUserData(user.uid);
        await deleteCurrentFirebaseUser();
      }
      if (clearDevice) {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('tq:'))
          .forEach((k) => localStorage.removeItem(k));
        await removeOfflineQuran().catch(() => {});
        await removeAllAudioDownloads().catch(() => {});
      }
      showToast('Data dan akun berhasil dihapus.');
      window.location.href = '/';
    } catch (err) {
      showToast(mapAuthError(err), { variant: 'error' });
      setDeleting(false);
    }
  }

  const downloadedCount = Object.keys(downloadedSurahs.value).length;

  return (
    <div class="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola profil, keamanan akun, tampilan aplikasi, pengingat, dan privasi."
      />

      {/* 6-Tab Pill Rail matching screenshots */}
      <div
        role="tablist"
        aria-label="Bagian pengaturan"
        class="inline-flex max-w-full flex-wrap gap-1 rounded-2xl bg-[var(--muted)] p-1.5"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              class={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--card)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon class="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB: PROFIL ================= */}
      {tab === 'profil' && (
        <div class="space-y-4">
          {authGate === 'loading' ? (
            <AuthGateSkeleton />
          ) : !signedIn ? (
            <Card key="settings-profil-guest" class="p-6">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                  <div class="flex size-14 items-center justify-center rounded-full bg-[var(--secondary)] text-lg font-bold text-[var(--secondary-foreground)]">
                    TQ
                  </div>
                  <div>
                    <p class="font-bold">Mode Tamu (Lokal)</p>
                    <p class="text-xs text-[var(--muted-foreground)]">
                      {isFirebaseConfigured
                        ? 'Masuk untuk menyinkronkan profil, bacaan, hafalan, dan tasbih di semua perangkat.'
                        : 'Firebase belum dikonfigurasi (.env). Semua datamu aman tersimpan di perangkat ini.'}
                    </p>
                  </div>
                </div>
                <Button href="/auth/login?redirect=%2Fapp%2Fpengaturan" size="sm">
                  <LogIn class="size-4" />
                  Masuk akun
                </Button>
              </div>
            </Card>
          ) : (
            <div key="settings-profil-auth" class="space-y-4">
              <Card class="flex items-center gap-4 p-5">
                <div class="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-xl font-bold text-[var(--secondary-foreground)]">
                  {userInitials.value}
                </div>
                <div>
                  <p class="text-base font-bold">{profile?.displayName || user?.displayName || 'Pembaca'}</p>
                  <p class="text-sm text-[var(--muted-foreground)]">{user?.email}</p>
                  {profile?.createdAt && (
                    <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      Bergabung sejak{' '}
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                        new Date(profile.createdAt)
                      )}
                    </p>
                  )}
                </div>
              </Card>

              <Card class="p-5 sm:p-6">
                <h2 class="text-base font-semibold">Data diri</h2>
                <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Kami hanya menyimpan nama tampilan dan email akun. Kami tidak meminta data pribadi lain.
                </p>

                <form onSubmit={saveProfile} class="mt-4 space-y-4">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label class="mb-1.5 block text-xs font-medium" for="prof-name">
                        Nama lengkap
                      </label>
                      <input
                        id="prof-name"
                        type="text"
                        required
                        value={fullName}
                        onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
                        class="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs font-medium" for="prof-email">
                        Email
                      </label>
                      <input
                        id="prof-email"
                        type="email"
                        disabled
                        value={user?.email || ''}
                        class="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-sm text-[var(--muted-foreground)]"
                      />
                      <p class="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        Ubah email dari tab Akun.
                      </p>
                    </div>
                  </div>
                  <div class="flex justify-end border-t border-[var(--border)] pt-4">
                    <Button type="submit" size="sm" disabled={savingProfile || !fullName.trim()}>
                      <Save class="size-3.5" />
                      {savingProfile ? 'Menyimpan…' : 'Simpan perubahan'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: AKUN ================= */}
      {tab === 'akun' && (
        <div class="space-y-4">
          {signedIn && user && (
            <>
              <Card class="space-y-3 p-5">
                <div>
                  <h2 class="text-base font-semibold">Email &amp; metode masuk</h2>
                  <p class="text-xs text-[var(--muted-foreground)]">
                    Alamat email dan cara kamu masuk ke akun ini.
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-sm">
                  <span class="font-medium">{user.email}</span>
                  <Badge variant={user.emailVerified ? 'success' : 'gold'}>
                    {user.emailVerified ? 'Terverifikasi' : 'Belum terverifikasi'}
                  </Badge>
                </div>
                {!user.emailVerified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await resendVerification().catch(() => {});
                      showToast('Email verifikasi sudah dikirim.', { variant: 'success' });
                    }}
                  >
                    Kirim ulang email verifikasi
                  </Button>
                )}
                <div class="pt-1">
                  <p class="text-xs text-[var(--muted-foreground)]">Metode masuk yang terhubung</p>
                  <div class="mt-1.5 flex flex-wrap gap-1.5">
                    {user.providerData.map((p) => (
                      <Badge key={p.providerId}>
                        {p.providerId === 'google.com' ? 'Google' : 'Email & kata sandi'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>

              {isGoogleOnly ? (
                <Card class="flex items-start gap-3 p-5 text-sm">
                  <Info class="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
                  <div>
                    <p class="font-semibold">Akun ini masuk dengan Google</p>
                    <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      Akun kamu tidak memiliki kata sandi terpisah, jadi email dan kata sandi dikelola melalui akun Google kamu.
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  <Card class="space-y-3 p-5">
                    <h2 class="text-sm font-semibold">Ubah email</h2>
                    <form
                      class="flex flex-wrap gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await requestEmailChange(newEmail);
                          showToast('Tautan konfirmasi dikirim ke email baru.', { variant: 'success' });
                          setNewEmail('');
                        } catch (err) {
                          showToast(mapAuthError(err), { variant: 'error' });
                        }
                      }}
                    >
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onInput={(e) => setNewEmail((e.target as HTMLInputElement).value)}
                        placeholder="email-baru@contoh.com"
                        class="h-9 flex-1 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
                      />
                      <Button size="sm" type="submit">Kirim tautan konfirmasi</Button>
                    </form>
                  </Card>

                  <Card class="space-y-3 p-5">
                    <h2 class="text-sm font-semibold">Ubah kata sandi</h2>
                    <form
                      class="grid gap-2.5 sm:grid-cols-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (newPw.length < 8) return showToast('Minimal 8 karakter.', { variant: 'error' });
                        if (newPw !== confirmPw) return showToast('Konfirmasi tidak sama.', { variant: 'error' });
                        try {
                          await changeAccountPassword(newPw);
                          showToast('Kata sandi berhasil diubah.', { variant: 'success' });
                          setNewPw('');
                          setConfirmPw('');
                        } catch (err) {
                          showToast(mapAuthError(err), { variant: 'error' });
                        }
                      }}
                    >
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPw}
                        onInput={(e) => setNewPw((e.target as HTMLInputElement).value)}
                        placeholder="Kata sandi baru (min. 8)"
                        class="h-9 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
                      />
                      <input
                        type="password"
                        required
                        value={confirmPw}
                        onInput={(e) => setConfirmPw((e.target as HTMLInputElement).value)}
                        placeholder="Ulangi kata sandi baru"
                        class="h-9 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
                      />
                      <div class="sm:col-span-2">
                        <Button size="sm" type="submit">Simpan kata sandi</Button>
                      </div>
                    </form>
                  </Card>
                </>
              )}
            </>
          )}

          <Card class="space-y-3 p-5">
            <div>
              <h2 class="text-base font-semibold">Data saya</h2>
              <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Unduh salinan data akunmu sebagai berkas JSON: profil, favorit, progres bacaan, hafalan, catatan, koleksi, tasbih, dan notifikasi.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={exportMyData}>
              <Download class="size-4" />
              Unduh data saya
            </Button>
          </Card>

          {signedIn && user && (
            <Card class="space-y-3 p-5">
              <div>
                <h2 class="text-base font-semibold">Keluar</h2>
                <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Akhiri sesi di perangkat ini. Data bacaan kamu tetap tersimpan di akun.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await logoutAccount();
                  clearLocalUserSessionData();
                  showToast('Kamu sudah keluar.');
                  window.location.href = '/app';
                }}
              >
                <LogOut class="size-4" />
                Keluar
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* ================= TAB: TAMPILAN ================= */}
      {tab === 'tampilan' && (
        <div class="space-y-4">
          {/* App Appearance */}
          <Card class="space-y-4 p-5">
            <div>
              <h2 class="text-base font-semibold">Tampilan aplikasi</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                Pengaturan ini disimpan di perangkat ini saja.
              </p>
            </div>

            <div>
              <p class="mb-2 text-xs font-semibold">Tema</p>
              <div class="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={themeMode.value === 'light' ? 'primary' : 'outline'}
                  onClick={() => setThemeMode('light')}
                >
                  <Sun class="size-3.5" /> Terang
                </Button>
                <Button
                  size="sm"
                  variant={themeMode.value === 'dark' ? 'primary' : 'outline'}
                  onClick={() => setThemeMode('dark')}
                >
                  <Moon class="size-3.5" /> Gelap
                </Button>
                <Button
                  size="sm"
                  variant={themeMode.value === 'system' ? 'primary' : 'outline'}
                  onClick={() => setThemeMode('system')}
                >
                  <Monitor class="size-3.5" /> Sistem
                </Button>
              </div>
              <p class="mt-1.5 text-xs text-[var(--muted-foreground)]">
                &ldquo;Sistem&rdquo; mengikuti pengaturan terang/gelap perangkat kamu.
              </p>
            </div>

            <div>
              <p class="mb-2 text-xs font-semibold">Bahasa aplikasi</p>
              <div class="flex gap-1.5">
                <Button
                  size="sm"
                  variant={locale.value === 'id' ? 'primary' : 'outline'}
                  onClick={() => setLocale('id')}
                >
                  Indonesia
                </Button>
                <Button
                  size="sm"
                  variant={locale.value === 'en' ? 'primary' : 'outline'}
                  onClick={() => setLocale('en')}
                >
                  English
                </Button>
              </div>
            </div>
          </Card>

          {/* Reading Preferences */}
          <Card class="space-y-5 p-5">
            <div>
              <h2 class="text-base font-semibold">Preferensi bacaan</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                Berlaku di semua halaman baca Al-Qur&apos;an pada perangkat ini.
              </p>
            </div>

            <div class="space-y-4">
              <div class="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <p
                  class="quran-text text-right text-[var(--foreground)]"
                  dir="rtl"
                  lang="ar"
                  style={{ fontSize: `${rs.arabicSize}px` }}
                >
                  بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                </p>
                {rs.showTransliteration && (
                  <p
                    style={{ fontSize: `${rs.latinSize}px` }}
                    class="mt-2 italic leading-relaxed text-[var(--muted-foreground)]"
                  >
                    Bismillāhir-raḥmānir-raḥīm
                  </p>
                )}
                {rs.showTranslation && (
                  <p
                    style={{ fontSize: `${rs.translationSize}px` }}
                    class="mt-1.5 leading-relaxed text-[var(--foreground)]"
                  >
                    {rs.translationLang === 'en'
                      ? 'In the name of Allah, the Entirely Merciful, the Especially Merciful.'
                      : 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.'}
                  </p>
                )}
              </div>

              <div>
                <div class="mb-1.5 flex items-center justify-between">
                  <label for="set-ar-size" class="text-xs font-semibold">
                    Ukuran teks Arab
                  </label>
                  <span class="text-xs font-semibold tabular-nums text-[var(--primary)]">
                    {rs.arabicSize}px
                  </span>
                </div>
                <input
                  id="set-ar-size"
                  type="range"
                  min={ARABIC_SIZE_LIMITS.min}
                  max={ARABIC_SIZE_LIMITS.max}
                  step={ARABIC_SIZE_LIMITS.step}
                  value={rs.arabicSize}
                  onInput={(e) =>
                    updateReaderSettings({ arabicSize: Number((e.target as HTMLInputElement).value) })
                  }
                  class="w-full cursor-pointer"
                />
              </div>

              <div>
                <div class="mb-1.5 flex items-center justify-between">
                  <label for="set-latin-size" class="text-xs font-semibold">
                    Ukuran teks Latin
                  </label>
                  <span class="text-xs font-semibold tabular-nums text-[var(--primary)]">
                    {rs.latinSize}px
                  </span>
                </div>
                <input
                  id="set-latin-size"
                  type="range"
                  min={LATIN_SIZE_LIMITS.min}
                  max={LATIN_SIZE_LIMITS.max}
                  step={LATIN_SIZE_LIMITS.step}
                  value={rs.latinSize}
                  onInput={(e) =>
                    updateReaderSettings({ latinSize: Number((e.target as HTMLInputElement).value) })
                  }
                  class="w-full cursor-pointer"
                />
              </div>

              <div>
                <div class="mb-1.5 flex items-center justify-between">
                  <label for="set-tr-size" class="text-xs font-semibold">
                    Ukuran teks Terjemahan
                  </label>
                  <span class="text-xs font-semibold tabular-nums text-[var(--primary)]">
                    {rs.translationSize}px
                  </span>
                </div>
                <input
                  id="set-tr-size"
                  type="range"
                  min={TRANSLATION_SIZE_LIMITS.min}
                  max={TRANSLATION_SIZE_LIMITS.max}
                  step={TRANSLATION_SIZE_LIMITS.step}
                  value={rs.translationSize}
                  onInput={(e) =>
                    updateReaderSettings({
                      translationSize: Number((e.target as HTMLInputElement).value),
                    })
                  }
                  class="w-full cursor-pointer"
                />
              </div>
            </div>

            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium">Warna tajwid</p>
                <p class="text-xs text-[var(--muted-foreground)]">
                  Teks Arab berwarna sesuai hukum tajwid (rasm Utsmani).
                </p>
                <a href="/app/tajwid" class="text-xs font-medium text-[var(--primary)] hover:underline">
                  Keterangan tajwid
                </a>
              </div>
              <Switch checked={rs.tajwid} onChange={(v) => updateReaderSettings({ tajwid: v })} />
            </div>

            <div class="space-y-2.5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium">Terjemahan</p>
                  <p class="text-xs text-[var(--muted-foreground)]">Tampilkan arti ayat.</p>
                </div>
                <Switch
                  checked={rs.showTranslation}
                  onChange={(v) => updateReaderSettings({ showTranslation: v })}
                />
              </div>
              {rs.showTranslation && (
                <div class="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={rs.translationLang === 'id' ? 'primary' : 'outline'}
                    onClick={() => updateReaderSettings({ translationLang: 'id' })}
                  >
                    Indonesia
                  </Button>
                  <Button
                    size="sm"
                    variant={rs.translationLang === 'en' ? 'primary' : 'outline'}
                    onClick={() => updateReaderSettings({ translationLang: 'en' })}
                  >
                    English
                  </Button>
                </div>
              )}
            </div>

            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium">Transliterasi</p>
                <p class="text-xs text-[var(--muted-foreground)]">Tampilkan bacaan latin.</p>
              </div>
              <Switch
                checked={rs.showTransliteration}
                onChange={(v) => updateReaderSettings({ showTransliteration: v })}
              />
            </div>

            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium">Sembunyikan teks Arab</p>
                <p class="text-xs text-[var(--muted-foreground)]">
                  Teks Arab diburamkan sampai diketuk.
                </p>
              </div>
              <Switch
                checked={rs.hideArabic}
                onChange={(v) => updateReaderSettings({ hideArabic: v })}
              />
            </div>

            <div class="border-t border-[var(--border)] pt-3">
              <Button size="sm" variant="outline" onClick={resetReaderSettings}>
                <RotateCcw class="size-3.5" />
                Kembalikan bawaan
              </Button>
            </div>
          </Card>

          {/* Pasang Aplikasi (PWA) */}
          <Card class="space-y-3 p-5">
            <div class="flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">
                <Smartphone class="size-4" />
              </div>
              <div>
                <h2 class="text-base font-semibold">Pasang aplikasi (PWA)</h2>
                <p class="text-xs text-[var(--muted-foreground)]">
                  Buka Teras Qur&apos;an langsung dari layar utama seperti aplikasi native, lebih cepat dan bisa diakses offline.
                </p>
              </div>
            </div>

            {isStandalonePwa.value ? (
              <div class="flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--accent)]/40 px-3.5 py-2.5 text-xs font-medium text-[var(--foreground)]">
                <CheckCircle2 class="size-4 shrink-0 text-[var(--primary)]" />
                Teras Qur&apos;an sudah terpasang dan berjalan sebagai aplikasi.
              </div>
            ) : canInstallPwa.value ? (
              <div>
                <Button size="sm" onClick={() => promptPwaInstall()}>
                  <Download class="size-4" />
                  Pasang Teras Qur&apos;an
                </Button>
              </div>
            ) : isIosSafari.value ? (
              <p class="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-xs text-[var(--muted-foreground)]">
                Di Safari iPhone/iPad: ketuk tombol <strong class="text-[var(--foreground)]">Bagikan</strong> lalu pilih <strong class="text-[var(--foreground)]">Tambahkan ke Layar Utama</strong>.
              </p>
            ) : (
              <p class="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-xs text-[var(--muted-foreground)]">
                Buka menu browser lalu pilih <strong class="text-[var(--foreground)]">Pasang aplikasi</strong> atau <strong class="text-[var(--foreground)]">Tambahkan ke layar utama</strong> untuk memasang Teras Qur&apos;an.
              </p>
            )}
          </Card>

          {/* Al-Qur'an Offline */}
          <Card class="space-y-3 p-5">
            <div>
              <h2 class="text-base font-semibold">Al-Qur&apos;an offline (PWA otomatis)</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                Semua menu, halaman, dan 114 surah otomatis disimpan di latar belakang agar tetap bisa dibuka saat tidak ada internet.
              </p>
            </div>

            {offJob ? (
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs tabular-nums">
                  <span>Menyimpan… {offJob.done} dari {offJob.total} berkas</span>
                  <Button size="sm" variant="ghost" onClick={cancelOfflineQuran}>Batal</Button>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    class="h-full bg-[var(--primary)]"
                    style={{ width: `${(offJob.done / Math.max(1, offJob.total)) * 100}%` }}
                  />
                </div>
              </div>
            ) : autoOfflineStatus.value.running ? (
              <div class="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
                <div class="flex items-center justify-between text-xs tabular-nums">
                  <span class="font-medium text-[var(--foreground)]">
                    {autoOfflineStatus.value.phase === 'shell'
                      ? 'Menyimpan halaman & menu aplikasi…'
                      : autoOfflineStatus.value.phase === 'surah'
                        ? `Menyimpan surah (${autoOfflineStatus.value.surahsCached}/114)…`
                        : autoOfflineStatus.value.phase === 'extra'
                          ? 'Menyimpan indeks pencarian & tajwid…'
                          : autoOfflineStatus.value.phase === 'tafsir'
                            ? `Menyimpan Tafsir Kemenag RI (${autoOfflineStatus.value.tafsirCached}/114)…`
                            : `Menyiapkan mode offline otomatis… (${autoOfflineStatus.value.surahsCached}/114 surah)`}
                  </span>
                  <span class="text-[var(--muted-foreground)]">
                    {autoOfflineStatus.value.total > 0
                      ? `${Math.round((autoOfflineStatus.value.done / autoOfflineStatus.value.total) * 100)}%`
                      : ''}
                  </span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    class="h-full bg-[var(--primary)] transition-all"
                    style={{
                      width: `${
                        autoOfflineStatus.value.total > 0
                          ? Math.min(100, (autoOfflineStatus.value.done / autoOfflineStatus.value.total) * 100)
                          : 20
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : autoOfflineStatus.value.ready || offMeta ? (
              <div class="space-y-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--accent)]/40 p-3.5 text-xs">
                  <span class="flex items-center gap-2 font-medium text-[var(--foreground)]">
                    <CheckCircle2 class="size-4 shrink-0 text-[var(--primary)]" />
                    <span>
                      Offline-First siap · {Math.max(autoOfflineStatus.value.surahsCached, 114)}/114 surah, semua menu &amp; 604 halaman
                      {autoOfflineStatus.value.tafsirCached >= 114
                        ? ' · 114/114 tafsir'
                        : autoOfflineStatus.value.tafsirCached > 0
                          ? ` · ${autoOfflineStatus.value.tafsirCached}/114 tafsir`
                          : ''}
                      {autoOfflineStatus.value.persisted ? ' · Penyimpanan dilindungi' : ''}
                    </span>
                  </span>
                  <div class="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        triggerAutoOfflineWarm(true);
                        inspectOfflineStatus();
                      }}
                    >
                      Perbarui
                    </Button>
                    <Button size="sm" variant="outline" onClick={removeOfflineQuran}>
                      Hapus
                    </Button>
                  </div>
                </div>
                {autoOfflineStatus.value.tafsirCached < 114 && (
                  <button
                    type="button"
                    onClick={() => saveOfflineQuran(true)}
                    class="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-xs font-medium hover:border-[var(--primary)] cursor-pointer"
                  >
                    <span class="flex items-center gap-2">
                      <Download class="size-3.5 text-[var(--primary)]" />
                      Lengkapi Tafsir Kemenag RI sekarang ({autoOfflineStatus.value.tafsirCached}/114 surah)
                    </span>
                    <span class="text-[var(--muted-foreground)]">~11 MB</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => saveOfflineQuran(false)}
                class="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium hover:border-[var(--primary)] cursor-pointer"
              >
                <span class="flex items-center gap-2">
                  <Download class="size-4 text-[var(--primary)]" />
                  Simpan Al-Qur&apos;an sekarang ({autoOfflineStatus.value.surahsCached}/114 surah)
                </span>
                <span class="text-xs text-[var(--muted-foreground)]">Otomatis / manual</span>
              </button>
            )}
            <p class="text-xs text-[var(--muted-foreground)]">
              Mencakup seluruh menu aplikasi, teks 114 surah (604 halaman), terjemahan ID/EN, warna tajwid, dan indeks pencarian. Audio murottal dapat diunduh terpisah per surah di pemutar.
            </p>
          </Card>

          {/* Audio Qari & Downloads */}
          <Card class="space-y-4 p-5">
            <div>
              <h2 class="text-base font-semibold">Audio</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                Qari dan unduhan disimpan di perangkat ini saja.
              </p>
            </div>

            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium">Ikuti ayat otomatis (Auto-scroll)</p>
                <p class="text-xs text-[var(--muted-foreground)]">
                  Halaman otomatis menggulir mengikuti ayat yang sedang dibacakan qari.
                </p>
              </div>
              <Switch
                checked={audioPrefs.value.autoScroll}
                onChange={(v) => updateAudioPrefs({ autoScroll: v })}
                label="Ikuti ayat otomatis saat audio diputar"
              />
            </div>

            <div class="space-y-1.5">
              <p class="text-xs font-semibold">Qari</p>
              {RECITERS.map((r) => {
                const selected = audioPrefs.value.reciter === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => updateAudioPrefs({ reciter: r.id })}
                    class={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                      selected
                        ? 'border-[var(--primary)] bg-[var(--accent)]/50 font-semibold text-[var(--foreground)]'
                        : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <span class="flex items-center gap-2.5">
                      <span
                        class={`flex size-4 items-center justify-center rounded-full border ${
                          selected ? 'border-[var(--primary)]' : 'border-[var(--muted-foreground)]'
                        }`}
                      >
                        {selected && <span class="size-2 rounded-full bg-[var(--primary)]" />}
                      </span>
                      {r.name}
                    </span>
                    <Badge>{r.style === 'murattal' ? 'Murattal' : 'Mujawwad'}</Badge>
                  </button>
                );
              })}
            </div>

            <div class="border-t border-[var(--border)] pt-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold">Kelola unduhan audio</p>
                  <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {downloadedCount > 0
                      ? `${downloadedCount} surah tersimpan offline di perangkat ini.`
                      : 'Belum ada surah yang diunduh. Unduh lewat tombol opsi audio di pemutar.'}
                  </p>
                  {freeSpaceMB !== null && (
                    <p class="mt-0.5 text-[11px] text-[var(--muted-foreground)] tabular-nums">
                      Sisa ruang perangkat: sekitar {(freeSpaceMB / 1024).toFixed(1)} GB.
                    </p>
                  )}
                </div>
                {downloadedCount > 0 && (
                  <Button size="sm" variant="destructive" onClick={removeAllAudioDownloads}>
                    Hapus semua
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB: PENGINGAT ================= */}
      {tab === 'pengingat' && (
        <Card class="space-y-5 p-5 sm:p-6">
          <div>
            <h2 class="text-base font-semibold">Pengingat harian</h2>
            <p class="text-xs text-[var(--muted-foreground)]">
              Ingatkan aku membaca Al-Qur&apos;an setiap hari pada waktu yang aku pilih.
            </p>
          </div>

          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium">Aktifkan pengingat harian</p>
              <p class="text-xs text-[var(--muted-foreground)]">
                Muncul sebagai notifikasi browser dan pemberitahuan di dalam aplikasi.
              </p>
            </div>
            <Switch
              checked={rem.enabled}
              onChange={(next) => {
                if (next) enableDailyReminder();
                else disableDailyReminder();
              }}
            />
          </div>

          {rem.enabled && (
            <div class="space-y-4 border-t border-[var(--border)] pt-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold" for="rem-time">
                  Waktu pengingat
                </label>
                <input
                  id="rem-time"
                  type="time"
                  value={rem.time}
                  onInput={(e) => updateReminderSettings({ time: (e.target as HTMLInputElement).value })}
                  class="h-10 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm tabular-nums"
                />
              </div>

              <div>
                <p class="mb-1.5 text-xs font-semibold">Hari aktif</p>
                <div class="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((lbl, idx) => {
                    const active = rem.days.includes(idx);
                    return (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? rem.days.filter((d) => d !== idx)
                            : [...rem.days, idx].sort((a, b) => a - b);
                          if (next.length) updateReminderSettings({ days: next });
                        }}
                        class={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                          active
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                            : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div class="flex items-center justify-between gap-4">
                <span class="text-xs">Lewati jika target harian sudah tercapai</span>
                <Switch
                  checked={rem.skipIfGoalMet}
                  onChange={(v) => updateReminderSettings({ skipIfGoalMet: v })}
                />
              </div>

              <div class="flex items-center justify-between gap-4">
                <span class="text-xs">Sertakan murajaah hafalan yang jatuh tempo</span>
                <Switch
                  checked={rem.includeHifz}
                  onChange={(v) => updateReminderSettings({ includeHifz: v })}
                />
              </div>

              <Button size="sm" variant="outline" onClick={sendTestReminder}>
                <Bell class="size-3.5" />
                Kirim notifikasi uji
              </Button>
            </div>
          )}

          <div class="space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-3.5 text-xs text-[var(--muted-foreground)]">
            <p>• Pengingat muncul saat aplikasi sedang terbuka, atau ketika aplikasi dibuka berikutnya setelah waktu pengingat.</p>
            <p>• Pengguna iPhone/iPad: notifikasi sistem bekerja jika aplikasi dipasang ke Layar Utama (iOS 16.4+).</p>
          </div>
        </Card>
      )}

      {/* ================= TAB: PRIVASI ================= */}
      {tab === 'privasi' && (
        <Card class="space-y-4 p-5 sm:p-6">
          <div>
            <h2 class="text-base font-semibold">Data yang kami simpan</h2>
            <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Hanya data yang dipakai aplikasi. Semuanya bisa kamu unduh atau hapus sendiri kapan saja.
            </p>
          </div>

          <ul class="list-disc space-y-1.5 pl-5 text-sm text-[var(--foreground)]">
            <li>Akun: email dan nama tampilan</li>
            <li>Bacaan: bacaan terakhir, hari membaca, target harian, dan progres khatam</li>
            <li>Hafalan: rentang ayat yang dihafal dan jadwal murajaahnya</li>
            <li>Favorit, koleksi ayat, surah pilihan, catatan, dan pengaturan pengingat</li>
            <li>Tasbih Digital: daftar dzikir custom beserta target dan riwayat harian</li>
            <li>Di perangkat ini saja: tampilan, qari, lokasi sholat, dan unduhan offline</li>
          </ul>

          <p class="text-xs text-[var(--muted-foreground)]">
            Kami tidak meminta nomor telepon, tanggal lahir, alamat, atau jenis kelamin.
          </p>

          <div class="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            <Button size="sm" variant="outline" onClick={exportMyData}>
              <Download class="size-3.5" />
              Unduh data saya
            </Button>
            <Button size="sm" variant="outline" href="/privacy-policy">
              <FileText class="size-3.5" />
              Kebijakan privasi
            </Button>
          </div>
        </Card>
      )}

      {/* ================= TAB: ZONA BAHAYA ================= */}
      {tab === 'bahaya' && (
        <Card class="space-y-4 p-5 sm:p-6">
          <div>
            <h2 class="text-base font-semibold">
              {signedIn ? 'Hapus akun' : 'Hapus seluruh data lokal'}
            </h2>
            <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {signedIn
                ? 'Menghapus akun dan seluruh data pribadimu secara permanen. Tindakan ini tidak bisa dibatalkan.'
                : 'Menghapus seluruh data bacaan, favorit, catatan, hafalan, progres, tasbih, dan cache offline di perangkat ini.'}
            </p>
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setDeleteStep(1);
              setConfirmWord('');
              setReauthPw('');
              setDeleteOpen(true);
            }}
          >
            <Trash2 class="size-4" />
            {signedIn ? 'Hapus akun' : 'Hapus data perangkat'}
          </Button>
        </Card>
      )}

      {/* 3-Step Danger Zone Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={user ? `Hapus akun · Langkah ${deleteStep} dari 3` : 'Hapus data perangkat'}
      >
        {deleteStep === 1 && (
          <div class="space-y-4 text-sm">
            <p class="text-xs text-[var(--muted-foreground)]">
              Data berikut akan dihapus permanen dan tidak bisa dikembalikan: profil, ayat favorit, surah pilihan, catatan, koleksi, progres khatam, hafalan, riwayat tasbih, dan notifikasi.
            </p>
            <div class="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteStep(user ? 2 : 3)}>
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {deleteStep === 2 && user && (
          <div class="space-y-4 text-sm">
            <p class="text-xs text-[var(--muted-foreground)]">
              Demi keamanan, konfirmasi identitasmu terlebih dahulu.
            </p>
            {hasPasswordProvider && (
              <input
                type="password"
                value={reauthPw}
                onInput={(e) => setReauthPw((e.target as HTMLInputElement).value)}
                placeholder="Kata sandi saat ini"
                class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
              />
            )}
            <div class="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeleteStep(1)}>Kembali</Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await reauthenticateUser(reauthPw);
                    setDeleteStep(3);
                  } catch (err) {
                    showToast(mapAuthError(err), { variant: 'error' });
                  }
                }}
              >
                {hasPasswordProvider ? 'Konfirmasi sandi' : 'Masuk ulang dengan Google'}
              </Button>
            </div>
          </div>
        )}

        {deleteStep === 3 && (
          <div class="space-y-4 text-sm">
            <p class="text-xs text-[var(--muted-foreground)]">
              Ketik <strong class="text-[var(--destructive)]">HAPUS</strong> untuk mengonfirmasi penghapusan permanen.
            </p>
            <input
              type="text"
              value={confirmWord}
              onInput={(e) => setConfirmWord((e.target as HTMLInputElement).value)}
              placeholder="Ketik HAPUS"
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm font-semibold"
            />
            <label class="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={clearDevice}
                onChange={(e) => setClearDevice((e.target as HTMLInputElement).checked)}
              />
              Hapus juga pengaturan &amp; data offline di perangkat ini
            </label>
            <div class="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleting || confirmWord.trim() !== 'HAPUS'}
                onClick={executeAccountDelete}
              >
                {deleting ? 'Menghapus…' : 'Hapus permanen'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
