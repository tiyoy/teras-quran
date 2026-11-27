import { useEffect, useState } from 'preact/hooks';
import { LockKeyhole, LogIn } from 'lucide-preact';
import { authReady, initAuthListener, isAuthenticated } from '@/stores/auth';
import { Button } from '@/components/ui/Primitives';

export type AuthGateState = 'loading' | 'guest' | 'authenticated';

/**
 * Hydration-safe auth gate state.
 * Always returns 'loading' during SSR and the initial hydration pass so Preact
 * hydrate() never reuses a mismatched DOM element/class across ClientRouter navigations.
 */
export function useAuthGate(): AuthGateState {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initAuthListener();
    setMounted(true);
  }, []);

  if (!mounted || !authReady.value) return 'loading';
  return isAuthenticated.value ? 'authenticated' : 'guest';
}

export function AuthGateSkeleton() {
  return (
    <div
      key="auth-gate-loading"
      role="status"
      aria-busy="true"
      aria-label="Memuat…"
      class="h-52 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]"
    />
  );
}

interface LoginRequiredProps {
  title?: string;
  description?: string;
}

export function LoginRequired({
  title = 'Masuk untuk melanjutkan',
  description = 'Fitur ini menyimpan data ke akun kamu, jadi kamu perlu masuk terlebih dahulu.',
}: LoginRequiredProps) {
  const [redirect, setRedirect] = useState('');

  useEffect(() => {
    initAuthListener();
    setRedirect(window.location.pathname + window.location.search);
  }, []);

  const loginHref = redirect
    ? `/auth/login?redirect=${encodeURIComponent(redirect)}`
    : '/auth/login';

  return (
    <section
      key="login-required-card"
      class="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center"
    >
      <div class="mx-auto mb-3.5 flex size-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
        <LockKeyhole class="size-5" />
      </div>
      <h2 class="text-base font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      <p class="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">
        {description}
      </p>
      <div class="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button href={loginHref} size="sm">
          <LogIn class="size-4" />
          Masuk
        </Button>
        <Button href="/auth/register" size="sm" variant="outline">
          Buat akun
        </Button>
      </div>
    </section>
  );
}
