import { useEffect, useState } from 'preact/hooks';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  LogOut,
  Plus,
  RefreshCw,
  Share2,
  Users,
} from 'lucide-preact';
import {
  claimKhatamanJuz,
  createKhatamanGroup,
  leaveKhatamanGroup,
  myKhatamanGroups,
  releaseKhatamanJuz,
  startNextKhatamanRound,
  subscribeKhatamanGroup,
  toggleKhatamanJuzDone,
  type KhatamanGroup,
} from '@/stores/khataman';
import { currentUid } from '@/stores/auth';
import { fetchQuranMeta, type JuzRef } from '@/lib/quran/api';
import { showToast } from '@/stores/toast';
import { AuthGateSkeleton, LoginRequired, useAuthGate } from '@/components/auth/LoginRequired';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/Primitives';

/* ======================== LIST KHATAMAN ======================== */
export function KhatamanListView() {
  const gate = useAuthGate();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const groups = myKhatamanGroups.value;

  if (gate !== 'authenticated') {
    return (
      <div>
        <PageHeader
          title="Khataman bersama"
          description="Khatam Al-Qur'an bersama keluarga, komunitas, atau teman: setiap orang mengambil jatah juz."
        />
        {gate === 'loading' ? (
          <AuthGateSkeleton />
        ) : (
          <LoginRequired description="Masuk untuk membuat atau ikut khataman bersama." />
        )}
      </div>
    );
  }

  async function onCreate(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const created = await createKhatamanGroup(title);
      if (created) {
        setTitle('');
        window.location.href = `/app/khataman/grup?id=${encodeURIComponent(created.id)}`;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="space-y-6">
      <PageHeader
        title="Khataman bersama"
        description="Khatam Al-Qur'an bersama keluarga, komunitas, atau teman: setiap orang mengambil jatah juz."
      />

      <Card class="p-5 sm:p-6">
        <form onSubmit={onCreate} class="space-y-3">
          <label class="block text-sm font-semibold" for="khataman-name">
            Nama khataman
          </label>
          <input
            id="khataman-name"
            type="text"
            maxLength={60}
            required
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="Misalnya: ODOJ Keluarga Bani Ahmad"
            class="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--background)] px-3.5 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
          <p class="text-xs text-[var(--muted-foreground)]">
            Setelah dibuat, bagikan tautannya agar yang lain bisa ikut mengambil juz.
          </p>
          <Button type="submit" size="sm" disabled={busy || !title.trim()}>
            <Plus class="size-4" />
            Buat khataman
          </Button>
        </form>
      </Card>

      <div>
        <h2 class="mb-3 text-sm font-semibold">Khatamanku</h2>
        {groups.length === 0 ? (
          <EmptyState
            icon={<Users class="size-5" />}
            title="Belum ikut khataman"
            description="Buat satu grup khataman di atas, lalu bagikan tautannya kepada keluarga atau teman."
          />
        ) : (
          <div class="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <a
                key={g.id}
                href={`/app/khataman/grup?id=${encodeURIComponent(g.id)}`}
                class="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)] no-underline"
              >
                <div class="min-w-0">
                  <p class="truncate font-semibold text-[var(--foreground)]">{g.title}</p>
                  <p class="mt-0.5 text-xs text-[var(--muted-foreground)] tabular-nums">
                    Putaran ke-{g.round} · {g.doneCount} dari 30 juz selesai
                  </p>
                </div>
                <ArrowRight class="size-4 shrink-0 text-[var(--muted-foreground)]" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================== GROUP KHATAMAN ======================== */
export function KhatamanGroupView() {
  const gate = useAuthGate();
  const loggedIn = gate === 'authenticated';
  const [groupId, setGroupId] = useState('');
  const [group, setGroup] = useState<KhatamanGroup | null>(null);
  const [juzRefs, setJuzRefs] = useState<JuzRef[]>([]);
  const [loading, setLoading] = useState(true);

  const actorUid = currentUid.value ?? 'local-user';

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    const id = new URLSearchParams(window.location.search).get('id') || '';
    setGroupId(id);
    fetchQuranMeta().then((m) => setJuzRefs(m.juzs)).catch(() => {});
    if (!id) {
      setLoading(false);
      return;
    }
    const unsub = subscribeKhatamanGroup(id, (g) => {
      setGroup(g);
      setLoading(false);
    });
    return unsub;
  }, [loggedIn]);

  if (gate !== 'authenticated') {
    return (
      <div>
        <a
          href="/app/khataman"
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline no-underline"
        >
          <ArrowLeft class="size-3.5" />
          Kembali ke daftar khataman
        </a>
        <PageHeader title="Khataman bersama" />
        {gate === 'loading' ? (
          <AuthGateSkeleton />
        ) : (
          <LoginRequired description="Masuk untuk membuat atau ikut khataman bersama." />
        )}
      </div>
    );
  }

  async function shareLink() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: group?.title || 'Khataman bersama',
          text: `Ayo ikut khataman "${group?.title}". Ambil satu juz di sini:`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Tautan khataman disalin.', { variant: 'success' });
      }
    } catch {
      showToast('Gagal menyalin tautan.', { variant: 'error' });
    }
  }

  async function act(fn: () => Promise<KhatamanGroup | null>) {
    try {
      const updated = await fn();
      if (updated) setGroup(updated);
    } catch (err) {
      const msg = (err as Error)?.message === 'taken'
        ? 'Juz ini baru saja diambil orang lain.'
        : 'Gagal menyimpan perubahan.';
      showToast(msg, { variant: 'error' });
    }
  }

  if (loading) {
    return <div class="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />;
  }

  if (!group) {
    return (
      <EmptyState
        icon={<Users class="size-5" />}
        title="Khataman tidak ditemukan"
        description="Tautannya mungkin salah, atau grup khataman ini sudah tidak ada."
        action={
          <Button href="/app/khataman" size="sm" variant="outline">
            <ArrowLeft class="size-4" />
            Kembali ke Khataman
          </Button>
        }
      />
    );
  }

  const pct = Math.round((group.doneCount / 30) * 100);

  return (
    <div class="space-y-5">
      <a
        href="/app/khataman"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline no-underline"
      >
        <ArrowLeft class="size-3.5" />
        Kembali ke daftar khataman
      </a>

      <PageHeader
        title={group.title}
        description={`Putaran ke-${group.round} · ${group.doneCount} dari 30 juz selesai (${pct}%)`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={shareLink}>
              <Share2 class="size-3.5" />
              Bagikan tautan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await leaveKhatamanGroup(groupId);
                window.location.href = '/app/khataman';
              }}
            >
              <LogOut class="size-3.5" />
              Keluar
            </Button>
          </>
        }
      />

      <Card class="p-4">
        <div class="h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          <div class="h-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
        </div>
        {group.doneCount >= 30 && (
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--accent)] p-3.5">
            <div>
              <p class="text-sm font-bold text-[var(--accent-foreground)]">Alhamdulillah, khatam!</p>
              <p class="text-xs text-[var(--accent-foreground)]/80">
                Ke-30 juz sudah selesai dibaca. Mulai putaran baru untuk khatam berikutnya.
              </p>
            </div>
            <Button size="sm" onClick={() => act(() => startNextKhatamanRound(groupId))}>
              <RefreshCw class="size-3.5" />
              Mulai putaran baru
            </Button>
          </div>
        )}
      </Card>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
          const slot = group.slots[String(juz)];
          const isMine = slot?.uid === actorUid;
          const isDone = Boolean(slot?.doneAt);
          const ref = juzRefs.find((r) => r.juz === juz);

          return (
            <Card
              key={juz}
              class={`flex flex-col justify-between p-4 ${
                isDone
                  ? 'border-[var(--primary)] bg-[var(--accent)]/40'
                  : isMine
                    ? 'border-[var(--primary)]/60'
                    : ''
              }`}
            >
              <div class="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-bold tabular-nums">Juz {juz}</p>
                  {ref && (
                    <p class="text-[11px] text-[var(--muted-foreground)]">
                      Mulai {ref.surahName}:{ref.ayah}
                    </p>
                  )}
                </div>
                {!slot ? (
                  <Badge>Kosong</Badge>
                ) : isDone ? (
                  <Badge variant="success">
                    <Check class="size-3" />
                    Selesai
                  </Badge>
                ) : isMine ? (
                  <Badge variant="primary">Bagianmu</Badge>
                ) : (
                  <Badge variant="gold">{slot.name || 'Pembaca'}</Badge>
                )}
              </div>

              <div class="flex flex-wrap gap-1.5">
                {!slot && (
                  <Button
                    size="sm"
                    variant="secondary"
                    class="w-full"
                    onClick={() => act(() => claimKhatamanJuz(groupId, juz))}
                  >
                    Ambil Juz {juz}
                  </Button>
                )}

                {isMine && !isDone && (
                  <>
                    {ref && (
                      <Button
                        size="sm"
                        variant="outline"
                        href={`/app/baca/${ref.surah}?ayat=${ref.ayah}`}
                      >
                        <BookOpen class="size-3.5" />
                        Baca
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => act(() => toggleKhatamanJuzDone(groupId, juz, true))}
                    >
                      Selesai
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => act(() => releaseKhatamanJuz(groupId, juz))}
                    >
                      Lepas
                    </Button>
                  </>
                )}

                {isMine && isDone && (
                  <Button
                    size="sm"
                    variant="outline"
                    class="w-full"
                    onClick={() => act(() => toggleKhatamanJuzDone(groupId, juz, false))}
                  >
                    Batal selesai
                  </Button>
                )}

                {slot && !isMine && (
                  <p class="text-xs text-[var(--muted-foreground)]">
                    Diambil oleh {slot.name || 'Pembaca'}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
