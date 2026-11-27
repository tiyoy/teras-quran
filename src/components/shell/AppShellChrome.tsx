import { useEffect, useState } from 'preact/hooks';
import { Bell, Feather, LogIn, Menu, Search, X } from 'lucide-preact';
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
import { isAuthenticated, userInitials } from '@/stores/auth';
import { unreadNotificationCount } from '@/stores/notifications';
import { bootstrapAppStores } from '@/stores/sync';
import { checkAndTriggerReminder } from '@/stores/reminders';
import { todayLog } from '@/stores/progress';
import { dueHifzItems } from '@/stores/hifz';

export function AppShellChrome({ initialPath }: { initialPath: string }) {
  const [pathname, setPathname] = useState(initialPath);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
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

  const unread = unreadNotificationCount.value;

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
      <header class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-[var(--background)] px-4 lg:pl-[17rem] lg:pr-6">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka menu navigasi"
          class="inline-flex size-9 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] lg:hidden cursor-pointer"
        >
          <Menu class="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          class="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 transition-colors cursor-pointer"
        >
          <Search class="size-4 shrink-0" />
          <span class="flex-1 truncate text-left">Cari menu atau surah…</span>
          <kbd class="hidden rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-[11px] font-medium sm:inline-block">
            ⌘K
          </kbd>
        </button>

        <div class="ml-auto flex items-center gap-1">
          <ThemeToggle />

          <a
            href="/app/notifikasi"
            aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
            class="relative inline-flex size-9 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <Bell class="size-[18px]" />
            {unread > 0 && (
              <span class="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-[var(--primary)]" />
            )}
          </a>

          {isAuthenticated.value ? (
            <a
              href="/app/pengaturan"
              aria-label="Pengaturan akun"
              class="ml-1 inline-flex size-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--secondary)] text-xs font-semibold text-[var(--secondary-foreground)] hover:border-[var(--primary)] no-underline"
            >
              {userInitials.value}
            </a>
          ) : (
            <a
              href="/auth/login"
              class="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] no-underline"
            >
              <LogIn class="size-3.5 text-[var(--primary)]" />
              <span class="hidden sm:inline">Masuk</span>
            </a>
          )}
        </div>
      </header>

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
