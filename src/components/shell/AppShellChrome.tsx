import { useEffect, useState } from 'preact/hooks';
import { ArrowLeft, Bell, Feather, LogIn, Menu, Search, WifiOff, X } from 'lucide-preact';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ToastContainer } from '@/components/ui/Primitives';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { AudioPlayerBar } from './AudioPlayerBar';
import {
  BOTTOM_SIDEBAR_ITEMS,
  isNavItemActive,
  MOBILE_QUICK_NAV,
  NAV_GROUPS,
} from './nav-items';
import { authUser, isAuthenticated, userInitials, userPhotoUrl, userProfile } from '@/stores/auth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { unreadNotificationCount } from '@/stores/notifications';
import { bootstrapAppStores } from '@/stores/sync';
import { checkAndTriggerReminder } from '@/stores/reminders';
import { todayLog } from '@/stores/progress';
import { dueHifzItems } from '@/stores/hifz';
import { autoOfflineStatus, isOnline } from '@/stores/offline';

export function AppShellChrome({ initialPath }: { initialPath: string }) {
  const [pathname, setPathname] = useState(initialPath);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    bootstrapAppStores();

    const syncPath = () => {
      setPathname(window.location.pathname);
      setDrawerOpen(false);
    };
    syncPath();

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };

    const reminderInterval = setInterval(() => {
      checkAndTriggerReminder(todayLog.value.goalMet, dueHifzItems.value.length);
    }, 60_000);
    checkAndTriggerReminder(todayLog.value.goalMet, dueHifzItems.value.length);

    document.addEventListener('astro:after-swap', syncPath);
    document.addEventListener('astro:page-load', syncPath);
    window.addEventListener('popstate', syncPath);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearInterval(reminderInterval);
      document.removeEventListener('astro:after-swap', syncPath);
      document.removeEventListener('astro:page-load', syncPath);
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const unread = mounted ? unreadNotificationCount.value : 0;

  const renderSidebarNav = () => (
    <div class="flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div class="flex h-14 shrink-0 items-center justify-between px-4">
        <BrandLogo href="/app" />
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Tutup menu"
          class="inline-flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] lg:hidden cursor-pointer"
        >
          <X class="size-4" />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-2" aria-label="Menu utama">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} class="mb-4">
            <p class="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-[var(--muted-foreground)]">
              {group.title}
            </p>
            <ul class="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      class={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors no-underline ${
                        active
                          ? 'bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]'
                          : 'text-[var(--sidebar-foreground)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      <Icon
                        class={`size-[17px] shrink-0 ${
                          active ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                        }`}
                      />
                      <span class="flex-1 truncate">{item.label}</span>
                      {active && <Feather class="size-3.5 shrink-0 text-[var(--gold)]" />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div class="shrink-0 border-t border-[var(--sidebar-border)] px-3 py-2.5">
        <ul class="space-y-0.5">
          {BOTTOM_SIDEBAR_ITEMS.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  class={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors no-underline ${
                    active
                      ? 'bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]'
                      : 'text-[var(--sidebar-foreground)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <Icon
                    class={`size-[17px] shrink-0 ${
                      active ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                    }`}
                  />
                  <span class="flex-1 truncate">{item.label}</span>
                  {active && <Feather class="size-3.5 shrink-0 text-[var(--gold)]" />}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside class="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--sidebar-border)] lg:block">
        {renderSidebarNav()}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div
          class="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <aside class="h-full w-72 max-w-[85vw] border-r border-[var(--sidebar-border)]">
            {renderSidebarNav()}
          </aside>
        </div>
      )}

      {/* Topbar */}
      <header class="sticky top-0 z-20 flex h-14 items-center gap-1.5 border-b border-[var(--border)] bg-[var(--background)] px-2.5 sm:gap-2 sm:px-4 lg:pl-[17rem] lg:pr-6">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka menu navigasi"
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] sm:size-9 lg:hidden cursor-pointer"
        >
          <Menu class="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          class="flex h-9 min-w-0 flex-1 max-w-[10.5rem] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 transition-colors sm:max-w-xs sm:gap-2 sm:px-3 sm:text-sm md:max-w-md cursor-pointer"
        >
          <Search class="size-4 shrink-0" />
          <span class="flex-1 truncate text-left sm:hidden">Cari…</span>
          <span class="hidden flex-1 truncate text-left sm:inline">Cari menu atau surah…</span>
          <kbd class="hidden rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-[11px] font-medium md:inline-block">
            ⌘K
          </kbd>
        </button>

        <div class="ml-auto flex shrink-0 items-center gap-1">
          <a
            href="/"
            data-astro-reload
            title="Kembali ke halaman awal"
            aria-label="Kembali ke halaman awal"
            class="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors sm:h-9 sm:gap-1.5 sm:px-2.5 no-underline"
          >
            <ArrowLeft class="size-3.5 shrink-0 text-[var(--primary)]" />
            <span class="sm:hidden">Awal</span>
            <span class="hidden sm:inline">Halaman awal</span>
          </a>

          <ThemeToggle />

          <a
            href="/app/notifikasi"
            aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
            class="relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors sm:size-9"
          >
            <Bell class="size-[18px]" />
            {unread > 0 && (
              <span class="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-[var(--primary)]" />
            )}
          </a>

          {mounted && isAuthenticated.value ? (
            <a
              key="shell-user-avatar"
              href="/app/pengaturan"
              aria-label="Pengaturan akun"
              title={userProfile.value?.displayName || authUser.value?.displayName || 'Pengaturan akun'}
              class="ml-0.5 inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] hover:border-[var(--primary)] sm:ml-1 no-underline"
            >
              <UserAvatar
                src={userPhotoUrl.value}
                initials={userInitials.value}
                alt={userProfile.value?.displayName || authUser.value?.displayName || 'Foto profil'}
                class="size-full text-xs font-semibold"
              />
            </a>
          ) : (
            <a
              key="shell-login-btn"
              href={
                mounted && pathname.startsWith('/app') && pathname !== '/app' && pathname !== '/app/'
                  ? `/auth/login?redirect=${encodeURIComponent(pathname)}`
                  : '/auth/login'
              }
              aria-label="Masuk"
              class="ml-0.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] sm:ml-1 sm:px-3 no-underline"
            >
              <LogIn class="size-3.5 text-[var(--primary)]" />
              <span class="hidden sm:inline">Masuk</span>
            </a>
          )}
        </div>
      </header>

      {/* Flat Offline-First Status Bar (shown only when browser is offline) */}
      {mounted && !isOnline.value && (
        <div
          role="status"
          aria-live="polite"
          class="border-b border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-xs text-[var(--secondary-foreground)] lg:pl-[17rem] lg:pr-6"
        >
          <div class="mx-auto flex max-w-4xl items-center gap-2">
            <WifiOff class="size-3.5 shrink-0 text-[var(--primary)]" />
            <p class="truncate">
              <strong class="font-semibold">Mode Offline</strong> —{' '}
              {autoOfflineStatus.value.surahsCached >= 114
                ? 'Seluruh 114 surah, 604 halaman & semua menu siap digunakan tanpa internet.'
                : `${autoOfflineStatus.value.surahsCached}/114 surah dan halaman tersimpan siap dibaca tanpa internet.`}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Nav */}
      <nav
        aria-label="Navigasi cepat"
        class="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-[var(--border)] bg-[var(--card)] px-1 lg:hidden"
      >
        {MOBILE_QUICK_NAV.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              class={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] no-underline ${
                active
                  ? 'font-semibold text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'
              }`}
            >
              <Icon class="size-[18px]" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <AudioPlayerBar />
      <ToastContainer />
    </>
  );
}
