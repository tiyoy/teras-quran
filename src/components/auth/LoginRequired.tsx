import { useEffect, useState } from 'preact/hooks';
import { LockKeyhole, LogIn } from 'lucide-preact';
import { authReady, initAuthListener } from '@/stores/auth';
import { Button, EmptyState } from '@/components/ui/Primitives';

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

  if (!authReady.value) {
    return (
      <div
        aria-busy="true"
        class="h-52 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]"
      />
    );
  }

  const loginHref = redirect
    ? `/auth/login?redirect=${encodeURIComponent(redirect)}`
    : '/auth/login';

  return (
    <EmptyState
      icon={<LockKeyhole class="size-5" />}
      title={title}
      description={description}
      action={
        <>
          <Button href={loginHref} size="sm">
            <LogIn class="size-4" />
            Masuk
          </Button>
          <Button href="/auth/register" size="sm" variant="outline">
            Buat akun
          </Button>
        </>
      }
    />
  );
}
