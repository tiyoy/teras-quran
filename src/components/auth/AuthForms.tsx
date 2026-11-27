import { useEffect, useState } from 'preact/hooks';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Mail } from 'lucide-preact';
import {
  isFirebaseConfigured,
  loginWithEmail,
  loginWithGoogle,
  mapAuthError,
  refreshCurrentUser,
  registerWithEmail,
  resendVerification,
  sendResetEmail,
} from '@/lib/firebase/auth';
import { authUser, initAuthListener } from '@/stores/auth';
import { Button, Card } from '@/components/ui/Primitives';

function FirebaseNotice() {
  if (isFirebaseConfigured) return null;
  return (
    <div class="mb-4 flex gap-2.5 rounded-xl border border-[var(--primary)]/30 bg-[var(--accent)] p-3.5 text-xs text-[var(--accent-foreground)]">
      <Info class="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
      <div class="space-y-1">
        <p class="font-semibold">Mode Lokal Aktif (Firebase belum diisi)</p>
        <p class="leading-relaxed">
          Salin <code class="font-mono">.env.example</code> menjadi <code class="font-mono">.env</code> dan isi kredensial Firebase kamu untuk mengaktifkan login Google/Email serta sinkronisasi cloud. Sementara ini, semua fitur tetap dapat digunakan langsung di perangkat ini.
        </p>
        <a href="/app" class="inline-block pt-1 font-semibold text-[var(--primary)] underline">
          Lanjut ke aplikasi tanpa akun →
        </a>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.89c2.28-2.1 3.53-5.2 3.53-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.89-3c-1.08.72-2.46 1.15-4.05 1.15-3.12 0-5.76-2.11-6.7-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l4.02-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4.02 3.1C6.24 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

function getSafeRedirect(): string {
  if (typeof window === 'undefined') return '/app';
  const raw = new URLSearchParams(window.location.search).get('redirect') || '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/app';
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initAuthListener();
  }, []);

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      await loginWithEmail(email, password);
      window.location.href = getSafeRedirect();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      window.location.href = getSafeRedirect();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card class="p-6">
      <div class="mb-5">
        <h1 class="text-xl font-bold tracking-tight">Masuk</h1>
        <p class="mt-1 text-sm text-[var(--muted-foreground)]">
          Lanjutkan bacaan, hafalan, dan dzikir Al-Qur&apos;an kamu.
        </p>
      </div>

      <FirebaseNotice />

      {error && (
        <div class="mb-4 flex items-start gap-2 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive-surface)] p-3 text-xs text-[var(--destructive)]">
          <AlertCircle class="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        variant="outline"
        class="w-full"
        disabled={busy || !isFirebaseConfigured}
        onClick={onGoogle}
      >
        <GoogleIcon />
        Masuk dengan Google
      </Button>

      <div class="my-4 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
        <span class="h-px flex-1 bg-[var(--border)]" />
        atau
        <span class="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form onSubmit={onSubmit} class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs font-medium" for="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="nama@contoh.com"
            class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium" for="login-password">
              Kata sandi
            </label>
            <a
              href="/auth/reset-password"
              class="text-xs font-medium text-[var(--primary)] hover:underline"
            >
              Lupa kata sandi?
            </a>
          </div>
          <div class="relative">
            <input
              id="login-password"
              type={(showPw ? 'text' : 'password') as 'text'}
              required
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] pl-3 pr-10 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              class="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-[var(--muted-foreground)] cursor-pointer"
            >
              {showPw ? <EyeOff class="size-4" /> : <Eye class="size-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" class="w-full" disabled={busy || !isFirebaseConfigured}>
          {busy ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>

      <p class="mt-5 text-center text-xs text-[var(--muted-foreground)]">
        Belum punya akun?{' '}
        <a href="/auth/register" class="font-semibold text-[var(--primary)] hover:underline">
          Buat akun
        </a>
      </p>
    </Card>
  );
}

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initAuthListener();
  }, []);

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Nama lengkap wajib diisi.');
    if (password.length < 8) return setError('Kata sandi minimal 8 karakter.');
    if (password !== confirm) return setError('Konfirmasi kata sandi tidak sama.');
    setBusy(true);
    try {
      await registerWithEmail(name, email, password);
      window.location.href = '/auth/verifikasi';
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      window.location.href = '/app';
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card class="p-6">
      <div class="mb-5">
        <h1 class="text-xl font-bold tracking-tight">Buat akun</h1>
        <p class="mt-1 text-sm text-[var(--muted-foreground)]">
          Simpan bacaan terakhir, favorit, catatan, hafalan, dan tasbih di semua perangkatmu.
        </p>
      </div>

      <FirebaseNotice />

      {error && (
        <div class="mb-4 flex items-start gap-2 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive-surface)] p-3 text-xs text-[var(--destructive)]">
          <AlertCircle class="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        variant="outline"
        class="w-full"
        disabled={busy || !isFirebaseConfigured}
        onClick={onGoogle}
      >
        <GoogleIcon />
        Daftar dengan Google
      </Button>

      <div class="my-4 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
        <span class="h-px flex-1 bg-[var(--border)]" />
        atau
        <span class="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form onSubmit={onSubmit} class="space-y-3.5">
        <div>
          <label class="mb-1 block text-xs font-medium" for="reg-name">
            Nama lengkap
          </label>
          <input
            id="reg-name"
            type="text"
            required
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="Nama kamu"
            class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium" for="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="nama@contoh.com"
            class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium" for="reg-pw">
            Kata sandi (minimal 8 karakter)
          </label>
          <input
            id="reg-pw"
            type="password"
            required
            minLength={8}
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium" for="reg-confirm">
            Ulangi kata sandi
          </label>
          <input
            id="reg-confirm"
            type="password"
            required
            value={confirm}
            onInput={(e) => setConfirm((e.target as HTMLInputElement).value)}
            class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <Button type="submit" class="w-full" disabled={busy || !isFirebaseConfigured}>
          {busy ? 'Membuat akun…' : 'Buat akun'}
        </Button>
      </form>

      <p class="mt-4 text-center text-[11px] text-[var(--muted-foreground)]">
        Dengan mendaftar, kamu menyetujui{' '}
        <a href="/privacy-policy" class="underline hover:text-[var(--foreground)]">
          Kebijakan Privasi
        </a>{' '}
        kami.
      </p>
      <p class="mt-3 text-center text-xs text-[var(--muted-foreground)]">
        Sudah punya akun?{' '}
        <a href="/auth/login" class="font-semibold text-[var(--primary)] hover:underline">
          Masuk
        </a>
      </p>
    </Card>
  );
}

export function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendResetEmail(email);
      setSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card class="p-6">
      <h1 class="text-xl font-bold tracking-tight">Atur ulang kata sandi</h1>
      <p class="mt-1 text-sm text-[var(--muted-foreground)]">
        Masukkan email akun kamu. Kami akan mengirim tautan untuk membuat kata sandi baru.
      </p>

      <div class="mt-4">
        <FirebaseNotice />
      </div>

      {sent ? (
        <div class="mt-4 space-y-4">
          <div class="flex items-start gap-2.5 rounded-xl border border-[var(--success)]/30 bg-[var(--success-surface)] p-3.5 text-xs text-[var(--success)]">
            <CheckCircle2 class="mt-0.5 size-4 shrink-0" />
            <div>
              <p class="font-semibold">Periksa email kamu</p>
              <p class="mt-0.5">
                Jika email terdaftar, tautan atur ulang sudah dikirim. Periksa kotak masuk dan folder spam kamu.
              </p>
            </div>
          </div>
          <Button href="/auth/login" class="w-full">
            Kembali ke halaman masuk
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} class="mt-4 space-y-4">
          {error && (
            <div class="flex items-start gap-2 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive-surface)] p-3 text-xs text-[var(--destructive)]">
              <AlertCircle class="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label class="mb-1.5 block text-xs font-medium" for="reset-email">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="nama@contoh.com"
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <Button type="submit" class="w-full" disabled={busy || !isFirebaseConfigured}>
            {busy ? 'Mengirim…' : 'Kirim tautan'}
          </Button>
          <p class="text-center text-xs text-[var(--muted-foreground)]">
            <a href="/auth/login" class="font-medium text-[var(--primary)] hover:underline">
              Kembali ke halaman masuk
            </a>
          </p>
        </form>
      )}
    </Card>
  );
}

export function VerifyEmailView() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    initAuthListener();
  }, []);

  const user = authUser.value;

  async function onRecheck() {
    setBusy(true);
    setStatus('');
    try {
      const u = await refreshCurrentUser();
      if (u?.emailVerified) {
        window.location.href = '/app';
      } else {
        setStatus('Belum terverifikasi. Cek folder spam atau kirim ulang email.');
      }
    } catch {
      setStatus('Gagal memeriksa status verifikasi.');
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setStatus('');
    try {
      await resendVerification();
      setStatus('Tautan verifikasi baru sudah dikirim.');
    } catch {
      setStatus('Email verifikasi belum terkirim. Coba lagi sebentar lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card class="p-6 text-center">
      <div class="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">
        <Mail class="size-5" />
      </div>
      <h1 class="text-xl font-bold tracking-tight">Cek email kamu</h1>
      <p class="mt-1.5 text-sm text-[var(--muted-foreground)]">
        Kami mengirim tautan verifikasi ke{' '}
        <span class="font-medium text-[var(--foreground)]">{user?.email || 'email kamu'}</span>. Buka tautan tersebut untuk mulai menyimpan data di akun.
      </p>
      {status && (
        <p class="mt-3 rounded-lg bg-[var(--muted)] px-3 py-2 text-xs text-[var(--foreground)]">
          {status}
        </p>
      )}
      <div class="mt-5 space-y-2">
        <Button class="w-full" disabled={busy || !user} onClick={onRecheck}>
          Saya sudah verifikasi
        </Button>
        <Button variant="outline" class="w-full" disabled={busy || !user} onClick={onResend}>
          Kirim ulang email
        </Button>
        <Button href="/app" variant="ghost" class="w-full">
          Lanjut tanpa verifikasi
        </Button>
      </div>
    </Card>
  );
}
