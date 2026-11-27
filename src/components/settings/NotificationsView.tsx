import { useEffect, useState } from 'preact/hooks';
import { Bell, CheckCheck } from 'lucide-preact';
import {
  markAllNotificationsRead,
  markNotificationRead,
  notifications,
  unreadNotificationCount,
} from '@/stores/notifications';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/Primitives';

const KIND_LABELS = {
  account: 'Akun',
  reminder: 'Pengingat',
  info: 'Info',
} as const;

export function NotificationsView() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const list = mounted ? notifications.value : [];
  const unread = mounted ? unreadNotificationCount.value : 0;

  const filtered = list.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Notifikasi"
        description={unread > 0 ? `${unread} notifikasi belum dibaca.` : 'Tidak ada notifikasi baru.'}
        actions={
          unread > 0 && (
            <Button size="sm" variant="outline" onClick={markAllNotificationsRead}>
              <CheckCheck class="size-4" />
              Tandai semua dibaca
            </Button>
          )
        }
      />

      <div class="mb-5 inline-flex rounded-xl bg-[var(--muted)] p-1">
        {(
          [
            ['all', 'Semua'],
            ['unread', `Belum dibaca (${unread})`],
            ['read', 'Sudah dibaca'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            class={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              filter === id
                ? 'bg-[var(--card)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell class="size-5" />}
          title={
            filter === 'unread'
              ? 'Semua sudah dibaca'
              : filter === 'read'
                ? 'Belum ada yang dibaca'
                : 'Belum ada notifikasi'
          }
          description="Pemberitahuan tentang akun dan pengingat harian akan muncul di sini."
        />
      ) : (
        <div class="space-y-2.5">
          {filtered.map((n) => (
            <Card
              key={n.id}
              class={`p-4 ${!n.read ? 'border-[var(--primary)]/50 bg-[var(--accent)]/35' : ''}`}
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge variant={n.type === 'reminder' ? 'primary' : 'default'}>
                      {KIND_LABELS[n.type]}
                    </Badge>
                    {!n.read && (
                      <span
                        key="unread-dot"
                        aria-hidden="true"
                        class="size-2 shrink-0 rounded-full bg-[var(--primary)]"
                      />
                    )}
                    <time
                      key="created-at"
                      dateTime={new Date(n.timestamp).toISOString()}
                      class="whitespace-nowrap text-[11px] tabular-nums text-[var(--muted-foreground)]"
                    >
                      {new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(n.timestamp))}
                    </time>
                  </div>
                  <p class="text-sm font-semibold text-[var(--foreground)]">{n.title}</p>
                  <p class="text-xs leading-relaxed text-[var(--muted-foreground)]">{n.body}</p>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markNotificationRead(n.id)}>
                    Tandai dibaca
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
