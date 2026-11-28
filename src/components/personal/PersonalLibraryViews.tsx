import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  FolderPlus,
  Heart,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-preact';
import {
  fetchAyahsByGlobalIds,
  fetchQuranMeta,
  type Ayah,
  type SurahMeta,
} from '@/lib/quran/api';
import {
  collections,
  createCollection,
  deleteAyahNote,
  deleteCollection,
  favorites,
  lastRead,
  notes,
  renameCollection,
  saveAyahNote,
  savedSurahs,
  toggleAyahInCollection,
  toggleSavedSurah,
} from '@/stores/library';
import { playAyah } from '@/stores/audio-player';
import { AuthGateSkeleton, LoginRequired, useAuthGate } from '@/components/auth/LoginRequired';
import { AyahCard } from '@/components/quran/AyahCard';
import { Rosette } from '@/components/ui/Rosette';
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui/Primitives';

/* ======================== BACAANKU ======================== */
export function LastReadView() {
  const gate = useAuthGate();
  const loggedIn = gate === 'authenticated';
  const lr = lastRead.value;
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [surah, setSurah] = useState<SurahMeta | null>(null);

  useEffect(() => {
    if (!loggedIn || !lr) {
      setAyah(null);
      return;
    }
    Promise.all([fetchQuranMeta(), fetchAyahsByGlobalIds([lr.globalAyahId])])
      .then(([meta, list]) => {
        setSurah(meta.surahs.find((s) => s.id === lr.surahId) ?? null);
        setAyah(list[0] ?? null);
      })
      .catch(() => {});
  }, [loggedIn, lr?.globalAyahId]);

  return (
    <div>
      <PageHeader
        title="Bacaanku"
        description="Ayat terakhir yang kamu baca, ketuk, atau dengarkan tersimpan otomatis lintas perangkat."
      />

      {gate === 'loading' ? (
        <AuthGateSkeleton />
      ) : gate === 'guest' ? (
        <LoginRequired description="Masuk untuk menyimpan dan melanjutkan bacaan terakhirmu di perangkat mana pun." />
      ) : !lr ? (
        <EmptyState
          icon={<Bookmark class="size-5" />}
          title="Belum ada bacaan terakhir"
          description="Baca surah, ketuk kartu ayat, atau putar murottal untuk menyimpan posisi bacaan terakhir secara otomatis."
          action={
            <Button href="/app/surah" size="sm">
              <BookOpen class="size-4" />
              Lihat daftar surah
            </Button>
          }
        />
      ) : (
        <div class="space-y-4">
          {ayah && surah && <AyahCard ayah={ayah} surahName={surah.name} />}
          <div class="flex flex-wrap gap-2">
            <Button href={`/app/baca/${lr.surahId}?ayat=${lr.ayahNumber}`} size="sm">
              Lanjutkan dari sini
              <ArrowRight class="size-3.5" />
            </Button>
            {surah && lr.ayahNumber < surah.ayahCount && (
              <Button
                href={`/app/baca/${lr.surahId}?ayat=${lr.ayahNumber + 1}`}
                size="sm"
                variant="outline"
              >
                Ayat berikutnya
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================== TERSIMPAN (FAVORIT & KOLEKSI) ======================== */
export function FavoritesView() {
  const gate = useAuthGate();
  const loggedIn = gate === 'authenticated';
  const [tab, setTab] = useState<'favorites' | 'collections'>('favorites');
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [colName, setColName] = useState('');

  const favList = favorites.value;
  const colList = collections.value;

  useEffect(() => {
    if (!loggedIn) return;
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn || !favList.length) {
      setAyahs([]);
      return;
    }
    fetchAyahsByGlobalIds(favList.map((f) => f.ayaId))
      .then(setAyahs)
      .catch(() => {});
  }, [loggedIn, favList]);

  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs]);

  if (gate !== 'authenticated') {
    return (
      <div>
        <PageHeader
          title="Tersimpan"
          description="Ayat favorit dan koleksi yang kamu simpan."
        />
        {gate === 'loading' ? (
          <AuthGateSkeleton />
        ) : (
          <LoginRequired description="Masuk untuk menyimpan ayat favorit dan membukanya kembali kapan saja." />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tersimpan"
        description={
          tab === 'favorites'
            ? 'Ayat-ayat yang kamu tandai dengan ikon hati.'
            : 'Ayat yang kamu kelompokkan dalam koleksi.'
        }
        actions={
          tab === 'collections' && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus class="size-4" />
              Koleksi baru
            </Button>
          )
        }
      />

      <div class="mb-6 grid grid-cols-2 rounded-xl bg-[var(--muted)] p-1">
        <button
          type="button"
          onClick={() => setTab('favorites')}
          class={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'favorites'
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Favorit ({favList.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('collections')}
          class={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'collections'
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Koleksi ({colList.length})
        </button>
      </div>

      {tab === 'favorites' ? (
        favList.length === 0 ? (
          <EmptyState
            icon={<Heart class="size-5" />}
            title="Belum ada ayat favorit"
            description="Ketuk ikon hati pada ayat mana pun untuk menyimpannya di sini."
            action={
              <Button href="/app/surah" size="sm">
                <BookOpen class="size-4" />
                Mulai membaca
              </Button>
            }
          />
        ) : (
          <div class="space-y-3.5">
            {ayahs.map((a) => (
              <AyahCard
                key={a.i}
                ayah={a}
                surahName={surahMap.get(a.surahId)?.name ?? `Surah ${a.surahId}`}
                queue={ayahs}
              />
            ))}
          </div>
        )
      ) : colList.length === 0 ? (
        <EmptyState
          icon={<FolderPlus class="size-5" />}
          title="Belum ada koleksi"
          description='Kelompokkan ayat dalam koleksi bernama, seperti "Doa" atau "Ayat Pilihan".'
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus class="size-4" />
              Buat koleksi pertama
            </Button>
          }
        />
      ) : (
        <div class="grid gap-3 sm:grid-cols-2">
          {colList.map((col) => (
            <a
              key={col.id}
              href={`/app/koleksi?id=${encodeURIComponent(col.id)}`}
              class="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)] no-underline"
            >
              <div>
                <p class="font-semibold text-[var(--foreground)]">{col.name}</p>
                <p class="mt-0.5 text-xs text-[var(--muted-foreground)] tabular-nums">
                  {col.ayahIds.length} ayat
                </p>
              </div>
              <ArrowRight class="size-4 text-[var(--muted-foreground)]" />
            </a>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Koleksi baru"
        description="Beri nama koleksimu. Ayat bisa ditambahkan dari menu ⋮ pada setiap ayat."
      >
        <form
          class="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (createCollection(colName)) {
              setColName('');
              setCreateOpen(false);
            }
          }}
        >
          <input
            id="create-collection-name"
            name="collectionName"
            aria-label="Nama koleksi baru"
            type="text"
            maxLength={60}
            required
            value={colName}
            onInput={(e) => setColName((e.target as HTMLInputElement).value)}
            placeholder="Mis. Doa, Renungan Pagi"
            class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
          <div class="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button size="sm" type="submit" disabled={!colName.trim()}>
              Buat
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ======================== DETAIL KOLEKSI ======================== */
export function CollectionDetailView() {
  const gate = useAuthGate();
  const loggedIn = gate === 'authenticated';
  const [colId, setColId] = useState('');
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    setColId(new URLSearchParams(window.location.search).get('id') || '');
    if (loggedIn) {
      fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
    }
  }, [loggedIn]);

  const col = collections.value.find((c) => c.id === colId) ?? null;

  useEffect(() => {
    if (!loggedIn || !col?.ayahIds.length) {
      setAyahs([]);
      return;
    }
    fetchAyahsByGlobalIds(col.ayahIds).then(setAyahs).catch(() => {});
  }, [loggedIn, col?.ayahIds]);

  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs]);

  if (gate !== 'authenticated') {
    return (
      <div>
        <a
          href="/app/favorit"
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline no-underline"
        >
          <ArrowLeft class="size-3.5" />
          Kembali ke Tersimpan
        </a>
        <PageHeader title="Koleksi" />
        {gate === 'loading' ? (
          <AuthGateSkeleton />
        ) : (
          <LoginRequired description="Masuk untuk membuat koleksi ayat dan membukanya kembali kapan saja." />
        )}
      </div>
    );
  }

  if (!col) {
    return (
      <EmptyState
        icon={<FolderPlus class="size-5" />}
        title="Koleksi tidak ditemukan"
        description="Koleksi ini mungkin sudah dihapus."
        action={
          <Button href="/app/favorit" size="sm" variant="outline">
            <ArrowLeft class="size-4" />
            Kembali ke Tersimpan
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <a
        href="/app/favorit"
        class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline no-underline"
      >
        <ArrowLeft class="size-3.5" />
        Kembali ke Tersimpan
      </a>

      <PageHeader
        title={col.name}
        description={`${col.ayahIds.length} ayat dalam koleksi ini.`}
        actions={
          <>
            {ayahs.length > 0 && (
              <Button
                size="sm"
                onClick={() =>
                  playAyah(
                    ayahs[0],
                    ayahs,
                    surahMap.get(ayahs[0].surahId)?.name ?? col.name
                  )
                }
              >
                <Play class="size-3.5" />
                Putar semua
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNameDraft(col.name);
                setRenameOpen(true);
              }}
            >
              <Pencil class="size-3.5" />
              Ganti nama
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                deleteCollection(col.id);
                window.location.href = '/app/favorit';
              }}
            >
              <Trash2 class="size-3.5" />
              Hapus
            </Button>
          </>
        }
      />

      {ayahs.length === 0 ? (
        <EmptyState
          icon={<BookOpen class="size-5" />}
          title="Koleksi ini masih kosong"
          description='Tambahkan ayat lewat menu ⋮ pada ayat mana pun, lalu pilih "Tambah ke koleksi".'
          action={
            <Button href="/app/surah" size="sm">
              Mulai membaca
            </Button>
          }
        />
      ) : (
        <div class="space-y-4">
          {ayahs.map((a) => (
            <div key={a.i} class="space-y-1.5">
              <AyahCard
                ayah={a}
                surahName={surahMap.get(a.surahId)?.name ?? `Surah ${a.surahId}`}
                queue={ayahs}
              />
              <div class="flex justify-end">
                <button
                  type="button"
                  onClick={() => toggleAyahInCollection(col.id, a.i)}
                  class="text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)] cursor-pointer"
                >
                  Hapus dari koleksi ini
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Ganti nama koleksi">
        <form
          class="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            renameCollection(col.id, nameDraft);
            setRenameOpen(false);
          }}
        >
          <input
            id="rename-collection-name"
            name="renameCollection"
            aria-label="Nama baru koleksi"
            type="text"
            maxLength={60}
            required
            value={nameDraft}
            onInput={(e) => setNameDraft((e.target as HTMLInputElement).value)}
            class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
          />
          <div class="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setRenameOpen(false)}>
              Batal
            </Button>
            <Button size="sm" type="submit">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ======================== CATATAN ======================== */
export function NotesView() {
  const gate = useAuthGate();
  const loggedIn = gate === 'authenticated';
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ ayaId: number; surahId: number; ayahNumber: number; text: string } | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, [loggedIn]);

  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs]);
  const list = notes.value;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((n) => {
      const sName = surahMap.get(n.surahId)?.name.toLowerCase() ?? '';
      return n.text.toLowerCase().includes(q) || sName.includes(q);
    });
  }, [list, query, surahMap]);

  if (gate !== 'authenticated') {
    return (
      <div>
        <PageHeader
          title="Catatan"
          description="Catatan pribadimu pada ayat-ayat Al-Qur'an."
        />
        {gate === 'loading' ? (
          <AuthGateSkeleton />
        ) : (
          <LoginRequired description="Masuk untuk menulis catatan pada ayat dan membukanya kembali kapan saja." />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Catatan"
        description="Catatan pribadimu pada ayat-ayat Al-Qur'an."
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<NotebookPen class="size-5" />}
          title="Belum ada catatan"
          description='Buka menu ⋮ pada ayat mana pun lalu pilih "Catatan".'
          action={
            <Button href="/app/surah" size="sm">
              <BookOpen class="size-4" />
              Mulai membaca
            </Button>
          }
        />
      ) : (
        <div class="space-y-4">
          <div class="relative max-w-md">
            <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              id="notes-search"
              name="notesSearch"
              aria-label="Cari di catatan"
              type="text"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder="Cari di catatanmu…"
              class="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] pl-10 pr-3 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          <div class="space-y-3">
            {filtered.map((n) => {
              const sName = surahMap.get(n.surahId)?.name ?? `Surah ${n.surahId}`;
              return (
                <Card key={n.ayaId} class="p-4 sm:p-5">
                  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="primary">
                      QS. {sName} : {n.ayahNumber}
                    </Badge>
                    <div class="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditing({
                            ayaId: n.ayaId,
                            surahId: n.surahId,
                            ayahNumber: n.ayahNumber,
                            text: n.text,
                          })
                        }
                      >
                        <Pencil class="size-3.5" />
                        Ubah
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        href={`/app/baca/${n.surahId}?ayat=${n.ayahNumber}`}
                      >
                        Buka ayat
                      </Button>
                    </div>
                  </div>
                  <p class="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">
                    {n.text}
                  </p>
                  <p class="mt-2 text-[11px] text-[var(--muted-foreground)]">
                    Diubah{' '}
                    {new Intl.DateTimeFormat('id-ID', {
                      dateStyle: 'medium',
                    }).format(new Date(n.updatedAt))}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <Modal
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          title={`Ubah catatan · ${surahMap.get(editing.surahId)?.name ?? ''}:${editing.ayahNumber}`}
        >
          <div class="space-y-3">
            <textarea
              id="edit-note-textarea"
              name="noteText"
              aria-label="Isi catatan ayat"
              rows={5}
              maxLength={2000}
              value={editing.text}
              onInput={(e) =>
                setEditing({ ...editing, text: (e.target as HTMLTextAreaElement).value })
              }
              class="w-full rounded-xl border border-[var(--input)] bg-[var(--background)] p-3 text-sm"
            />
            <div class="flex justify-between">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  deleteAyahNote(editing.ayaId);
                  setEditing(null);
                }}
              >
                Hapus
              </Button>
              <div class="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    saveAyahNote(editing.ayaId, editing.surahId, editing.ayahNumber, editing.text);
                    setEditing(null);
                  }}
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ======================== SURAH PILIHAN ======================== */
export function SavedSurahsView() {
  const gate = useAuthGate();
  const loggedIn = gate === 'authenticated';
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const ids = savedSurahs.value;

  useEffect(() => {
    if (!loggedIn) return;
    fetchQuranMeta().then((m) => setSurahs(m.surahs)).catch(() => {});
  }, [loggedIn]);

  const list = surahs.filter((s) => ids.includes(s.id));

  if (gate !== 'authenticated') {
    return (
      <div>
        <PageHeader
          title="Surah pilihan"
          description="Surah yang kamu tandai dengan ikon bintang."
        />
        {gate === 'loading' ? (
          <AuthGateSkeleton />
        ) : (
          <LoginRequired description="Masuk untuk menyimpan surah pilihan dan membukanya kembali dengan cepat." />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Surah pilihan"
        description="Surah yang kamu tandai dengan ikon bintang."
      />

      {ids.length === 0 ? (
        <EmptyState
          icon={<Star class="size-5" />}
          title="Belum ada surah pilihan"
          description="Ketuk ikon bintang pada surah untuk menyimpannya di sini."
          action={
            <Button href="/app/surah" size="sm">
              <BookOpen class="size-4" />
              Lihat daftar surah
            </Button>
          }
        />
      ) : (
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <div
              key={s.id}
              class="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--primary)]"
            >
              <a
                href={`/app/baca/${s.id}`}
                class="flex min-w-0 flex-1 items-center gap-3 no-underline"
              >
                <Rosette number={s.id} />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-[var(--foreground)]">{s.name}</p>
                  <p class="truncate text-xs text-[var(--muted-foreground)]">
                    {s.meaning} · {s.ayahCount} ayat
                  </p>
                </div>
              </a>
              <button
                type="button"
                onClick={() => toggleSavedSurah(s.id)}
                aria-label="Hapus dari surah pilihan"
                class="rounded-lg p-1.5 text-[var(--primary)] hover:bg-[var(--muted)] cursor-pointer"
              >
                <Star class="size-4 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
