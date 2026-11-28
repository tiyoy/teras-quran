import { useEffect, useRef, useState } from 'preact/hooks';
import {
  BookHeart,
  BookOpen,
  Bookmark,
  Check,
  Copy,
  Download,
  FolderPlus,
  Heart,
  Image as ImageIcon,
  MoreVertical,
  NotebookPen,
  Pause,
  Play,
  Share2,
  Sparkles,
} from 'lucide-preact';
import type { Ayah } from '@/lib/quran/api';
import { formatHizb, getSurahAyahCount } from '@/lib/quran/meta';
import { tajwidClassName, type TajwidGroup, type TajwidSegment } from '@/lib/quran/tajwid-parser';
import { TAJWID_RULE_MAP } from '@/data/tajwid-rules';
import {
  renderAyahShareBlob,
  type ShareSize,
  type ShareStyle,
} from '@/lib/quran/share-image';
import { getTranslationText, readerSettings } from '@/stores/reader-settings';
import { currentAyah, isPlaying, playAyah } from '@/stores/audio-player';
import {
  collections,
  createCollection,
  deleteAyahNote,
  getNoteForAyah,
  isFavoriteAyah,
  lastRead,
  saveAyahNote,
  setLastRead,
  toggleAyahInCollection,
  toggleFavoriteAyah,
} from '@/stores/library';
import { addHifzRange } from '@/stores/hifz';
import { showToast } from '@/stores/toast';
import { Rosette } from '@/components/ui/Rosette';
import { Badge, Button, Modal } from '@/components/ui/Primitives';

interface AyahCardProps {
  ayah: Ayah;
  surahName: string;
  queue?: Ayah[];
  tajwidSegments?: TajwidSegment[];
  highlighted?: boolean;
  enableTapLastRead?: boolean;
  onManualLastRead?: (ayah: Ayah) => void;
}

export function AyahCard({
  ayah,
  surahName,
  queue,
  tajwidSegments,
  highlighted = false,
  enableTapLastRead = false,
  onManualLastRead,
}: AyahCardProps) {
  const settings = readerSettings.value;
  const isCurrent = currentAyah.value?.i === ayah.i;
  const playingThis = isCurrent && isPlaying.value;
  const fav = isFavoriteAyah(ayah.i);
  const isLastRead = lastRead.value?.globalAyahId === ayah.i;
  const existingNote = getNoteForAyah(ayah.i);

  const [revealed, setRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [colOpen, setColOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [hifzOpen, setHifzOpen] = useState(false);
  const [hifzFrom, setHifzFrom] = useState(ayah.n);
  const [hifzTo, setHifzTo] = useState(ayah.n);
  const [shareOpen, setShareOpen] = useState(false);
  const [hoveredRule, setHoveredRule] = useState<TajwidGroup | null>(null);

  // Share image modal state
  const [shareStyle, setShareStyle] = useState<ShareStyle>('terang');
  const [shareSize, setShareSize] = useState<ShareSize>('square');
  const [shareAr, setShareAr] = useState(true);
  const [shareLat, setShareLat] = useState(false);
  const [shareTr, setShareTr] = useState(true);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string>('');
  const [shareBusy, setShareBusy] = useState(false);

  const translation = getTranslationText(ayah);
  const maxSurahAyah = getSurahAyahCount(ayah.surahId);

  function computeMenuPos() {
    const MENU_WIDTH = 224;
    const ESTIMATED_HEIGHT = 344;
    const MARGIN = 12;
    const btn = menuBtnRef.current;
    if (!btn || typeof window === 'undefined') {
      return { left: MARGIN, top: 64, maxHeight: 360 };
    }
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hasAudioBar = Boolean(currentAyah.value);
    const bottomSafe = (vw < 1024 ? 68 : MARGIN) + (hasAudioBar ? 64 : 0);
    const topSafe = 64;

    const rightAlignedLeft = rect.right - MENU_WIDTH;
    const preferredLeft = rightAlignedLeft >= MARGIN ? rightAlignedLeft : rect.left;
    const left = Math.max(MARGIN, Math.min(preferredLeft, vw - MENU_WIDTH - MARGIN));

    const spaceBelow = vh - bottomSafe - rect.bottom - 6;
    const spaceAbove = rect.top - topSafe - 6;

    if (spaceBelow >= ESTIMATED_HEIGHT || spaceBelow >= spaceAbove) {
      return {
        left,
        top: Math.max(topSafe, rect.bottom + 6),
        maxHeight: Math.max(160, Math.min(420, spaceBelow)),
      };
    }

    return {
      left,
      bottom: Math.max(bottomSafe, vh - rect.top + 6),
      maxHeight: Math.max(160, Math.min(420, spaceAbove)),
    };
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && menuPanelRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onResize = () => setMenuPos(computeMenuPos());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!shareOpen) {
      if (sharePreviewUrl) {
        URL.revokeObjectURL(sharePreviewUrl);
        setSharePreviewUrl('');
      }
      return;
    }
    let alive = true;
    setShareBusy(true);
    renderAyahShareBlob({
      surahName,
      surahId: ayah.surahId,
      ayahNumber: ayah.n,
      arabic: ayah.ar,
      latin: ayah.tr,
      translation,
      translationLang: settings.translationLang,
      style: shareStyle,
      size: shareSize,
      showArabic: shareAr,
      showLatin: shareLat,
      showTranslation: shareTr,
    })
      .then((blob) => {
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        setSharePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setShareBusy(false);
      });

    return () => {
      alive = false;
    };
  }, [shareOpen, shareStyle, shareSize, shareAr, shareLat, shareTr, ayah.i, settings.translationLang]);

  async function copyAyahText() {
    const text = `${ayah.ar}\n\n${ayah.tr}\n\n"${translation}"\n— QS. ${surahName}: ${ayah.n} (Teras Qur'an)`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Ayat disalin.', { variant: 'success' });
    } catch {
      showToast('Tidak bisa menyalin ayat.', { variant: 'error' });
    }
    setMenuOpen(false);
  }

  async function shareAyahText() {
    const text = `${ayah.ar}\n\n"${translation}"\n— QS. ${surahName}: ${ayah.n} (Teras Qur'an)`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `QS. ${surahName}:${ayah.n}`, text });
      } catch {
        // cancelled
      }
    } else {
      await copyAyahText();
    }
    setMenuOpen(false);
  }

  function downloadShareImage() {
    if (!sharePreviewUrl) return;
    const a = document.createElement('a');
    a.href = sharePreviewUrl;
    a.download = `teras-quran-${ayah.surahId}-${ayah.n}.png`;
    a.click();
    showToast('Gambar diunduh.', { variant: 'success' });
  }

  function handleCardTap(e: MouseEvent) {
    if (!enableTapLastRead) return;
    if (menuOpen || noteOpen || colOpen || hifzOpen || shareOpen) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (
      target.closest('button, a, input, textarea, select, label, [role="dialog"], [data-tajwid-word], [data-ignore-card-tap]')
    ) {
      return;
    }
    const sel = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
    if (sel && sel.trim().length > 0) return;

    setLastRead({
      surahId: ayah.surahId,
      ayahNumber: ayah.n,
      globalAyahId: ayah.i,
      page: ayah.page,
      juz: ayah.juz,
    });
    onManualLastRead?.(ayah);
  }

  return (
    <article
      id={`ayat-${ayah.n}`}
      data-ayah-num={ayah.n}
      onClick={handleCardTap}
      class={`scroll-mt-20 rounded-2xl border p-4 transition-colors sm:p-6 ${
        isCurrent || highlighted
          ? 'border-[var(--primary)] bg-[var(--accent)]/40'
          : isLastRead
            ? 'border-[var(--primary)]/50 bg-[var(--card)]'
            : 'border-[var(--border)] bg-[var(--card)]'
      } ${enableTapLastRead ? 'cursor-pointer hover:border-[var(--primary)]/50' : ''}`}
    >
      {/* Top Action Row */}
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <Rosette number={ayah.n} size="sm" active={isCurrent} />
          <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] tabular-nums">
            <span>Juz {ayah.juz}</span>
            <span>·</span>
            <span>Hal. {ayah.page}</span>
            <span>·</span>
            <span>Hizb {formatHizb(ayah.hizb)}</span>
          </div>
          {isLastRead && <Badge variant="primary">Bacaan terakhir</Badge>}
          {ayah.sajda && (
            <Badge variant="gold">
              <Sparkles class="size-3" />
              Ayat sajdah
            </Badge>
          )}
          {existingNote && (
            <button
              type="button"
              onClick={() => {
                setNoteDraft(existingNote.text);
                setNoteOpen(true);
              }}
              class="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--secondary-foreground)] hover:border-[var(--primary)] cursor-pointer"
            >
              <NotebookPen class="size-3" />
              Catatan
            </button>
          )}
        </div>

        <div class="relative ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => playAyah(ayah, queue ?? [ayah], surahName)}
            aria-label={playingThis ? 'Jeda audio' : 'Putar audio'}
            title={playingThis ? 'Jeda audio' : 'Putar audio'}
            class={`inline-flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
              playingThis
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {playingThis ? <Pause class="size-4" /> : <Play class="size-4" />}
          </button>

          <button
            type="button"
            onClick={() => toggleFavoriteAyah(ayah.i, ayah.surahId, ayah.n)}
            aria-label={fav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            title={fav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            class={`inline-flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
              fav
                ? 'text-[var(--destructive)] bg-[var(--destructive-surface)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Heart class={`size-4 ${fav ? 'fill-current' : ''}`} />
          </button>

          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => {
              setMenuOpen((prev) => {
                if (!prev) setMenuPos(computeMenuPos());
                return !prev;
              });
            }}
            aria-label="Aksi lainnya"
            aria-expanded={menuOpen}
            class="inline-flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
          >
            <MoreVertical class="size-4" />
          </button>

          {menuOpen && menuPos && (
            <>
              <div class="fixed inset-0 z-[50] bg-black/30" onClick={() => setMenuOpen(false)} />
              <div
                ref={menuPanelRef}
                role="menu"
                style={{
                  left: `${menuPos.left}px`,
                  ...(menuPos.top !== undefined ? { top: `${menuPos.top}px` } : {}),
                  ...(menuPos.bottom !== undefined ? { bottom: `${menuPos.bottom}px` } : {}),
                  maxHeight: `${menuPos.maxHeight}px`,
                  backgroundColor: 'var(--popover)',
                }}
                class="fixed z-[55] w-56 overflow-y-auto rounded-xl border border-[var(--input)] bg-[var(--popover)] p-1.5 text-sm text-[var(--popover-foreground)] shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => {
                    setLastRead({
                      surahId: ayah.surahId,
                      ayahNumber: ayah.n,
                      globalAyahId: ayah.i,
                      page: ayah.page,
                      juz: ayah.juz,
                    });
                    setMenuOpen(false);
                  }}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] cursor-pointer"
                >
                  <Bookmark class="size-4 text-[var(--primary)]" />
                  Tandai bacaan terakhir
                </button>
                <a
                  href={`/app/tafsir?surah=${ayah.surahId}&ayat=${ayah.n}`}
                  onClick={() => setMenuOpen(false)}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[var(--foreground)] hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] no-underline"
                >
                  <BookOpen class="size-4 text-[var(--muted-foreground)]" />
                  Buka tafsir
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft(existingNote?.text ?? '');
                    setNoteOpen(true);
                    setMenuOpen(false);
                  }}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] cursor-pointer"
                >
                  <NotebookPen class="size-4 text-[var(--muted-foreground)]" />
                  Catatan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setColOpen(true);
                    setMenuOpen(false);
                  }}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] cursor-pointer"
                >
                  <FolderPlus class="size-4 text-[var(--muted-foreground)]" />
                  Tambah ke koleksi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHifzFrom(ayah.n);
                    setHifzTo(ayah.n);
                    setHifzOpen(true);
                    setMenuOpen(false);
                  }}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] cursor-pointer"
                >
                  <BookHeart class="size-4 text-[var(--muted-foreground)]" />
                  Tandai hafalan
                </button>
                <div class="my-1 h-px bg-[var(--border)]" />
                <button
                  type="button"
                  onClick={copyAyahText}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] cursor-pointer"
                >
                  <Copy class="size-4 text-[var(--muted-foreground)]" />
                  Salin ayat
                </button>
                <button
                  type="button"
                  onClick={shareAyahText}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] cursor-pointer"
                >
                  <Share2 class="size-4 text-[var(--muted-foreground)]" />
                  Bagikan teks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareOpen(true);
                    setMenuOpen(false);
                  }}
                  class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted)] dark:hover:bg-[var(--border)] cursor-pointer"
                >
                  <ImageIcon class="size-4 text-[var(--muted-foreground)]" />
                  Bagikan gambar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Arabic Text (Tajwid or LPMQ, with Hide Arabic blur mode) */}
      <div
        onClick={(e) => {
          if (settings.hideArabic) {
            e.stopPropagation();
            setRevealed((r) => !r);
          }
        }}
        class={`relative ${settings.hideArabic ? 'cursor-pointer select-none' : ''}`}
        title={settings.hideArabic ? 'Ketuk untuk menampilkan teks Arab' : undefined}
      >
        <p
          dir="rtl"
          lang="ar"
          style={{ fontSize: `${settings.arabicSize}px` }}
          class={`${settings.tajwid && tajwidSegments ? 'tajwid-text' : 'quran-text'} text-right text-[var(--foreground)] transition-[filter] ${
            settings.hideArabic && !revealed ? 'blur-md opacity-45' : ''
          }`}
        >
          {settings.tajwid && tajwidSegments
            ? tajwidSegments.map(([txt, grp], idx) =>
                grp ? (
                  <span
                    key={idx}
                    data-tajwid-word="true"
                    class={`${tajwidClassName(grp)} cursor-pointer rounded px-0.5 hover:bg-[var(--muted)]`}
                    onMouseEnter={() => setHoveredRule(grp)}
                    onMouseLeave={() => setHoveredRule(null)}
                    onClick={(e) => {
                      if (!settings.hideArabic) {
                        e.stopPropagation();
                        setHoveredRule((prev) => (prev === grp ? null : grp));
                      }
                    }}
                  >
                    {txt}
                  </span>
                ) : (
                  <span key={idx}>{txt}</span>
                )
              )
            : ayah.ar}
        </p>

        {settings.tajwid && hoveredRule && TAJWID_RULE_MAP[hoveredRule] && (
          <div class="mt-2 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs">
            <span class={`font-semibold ${TAJWID_RULE_MAP[hoveredRule].cssClass}`}>
              {TAJWID_RULE_MAP[hoveredRule].name}
            </span>
            <span class="text-[var(--muted-foreground)]">
              — {TAJWID_RULE_MAP[hoveredRule].shortDesc}
            </span>
          </div>
        )}
      </div>

      {/* Transliteration */}
      {settings.showTransliteration && ayah.tr && (
        <p
          style={{ fontSize: `${settings.latinSize}px` }}
          class="mt-3 italic leading-relaxed text-[var(--muted-foreground)]"
        >
          {ayah.tr}
        </p>
      )}

      {/* Translation */}
      {settings.showTranslation && (
        <p
          style={{ fontSize: `${settings.translationSize}px` }}
          class="mt-2 leading-relaxed text-[var(--foreground)]"
        >
          {translation}
        </p>
      )}

      {/* Note Modal */}
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title={`Catatan · ${surahName}:${ayah.n}`}
        description="Hanya kamu yang bisa melihat catatan ini."
      >
        <div class="space-y-3">
          <textarea
            id={`ayah-note-${ayah.i}`}
            name="ayahNote"
            aria-label="Catatan ayat"
            rows={5}
            maxLength={2000}
            value={noteDraft}
            onInput={(e) => setNoteDraft((e.target as HTMLTextAreaElement).value)}
            placeholder="Tulis renungan, pelajaran, atau pengingat tentang ayat ini…"
            class="w-full rounded-xl border border-[var(--input)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
          <div class="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span class="tabular-nums">{noteDraft.length}/2000</span>
            <div class="flex gap-2">
              {existingNote && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    deleteAyahNote(ayah.i);
                    setNoteOpen(false);
                  }}
                >
                  Hapus
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  saveAyahNote(ayah.i, ayah.surahId, ayah.n, noteDraft);
                  setNoteOpen(false);
                }}
              >
                Simpan catatan
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Collection Modal */}
      <Modal
        open={colOpen}
        onClose={() => setColOpen(false)}
        title="Tambah ke koleksi"
        description={`Pilih koleksi untuk QS. ${surahName}:${ayah.n}`}
      >
        <div class="space-y-4">
          {collections.value.length === 0 ? (
            <p class="text-sm text-[var(--muted-foreground)]">
              Belum ada koleksi. Buat koleksi pertamamu di bawah.
            </p>
          ) : (
            <div class="space-y-1.5">
              {collections.value.map((col) => {
                const checked = col.ayahIds.includes(ayah.i);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleAyahInCollection(col.id, ayah.i)}
                    class={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm cursor-pointer ${
                      checked
                        ? 'border-[var(--primary)] bg-[var(--accent)] text-[var(--accent-foreground)] font-medium'
                        : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <span>
                      {col.name}{' '}
                      <span class="text-xs text-[var(--muted-foreground)]">
                        ({col.ayahIds.length} ayat)
                      </span>
                    </span>
                    {checked && <Check class="size-4 text-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
          )}

          <form
            class="flex gap-2 border-t border-[var(--border)] pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const created = createCollection(newColName);
              if (created) {
                toggleAyahInCollection(created.id, ayah.i);
                setNewColName('');
              }
            }}
          >
            <input
              id={`ayah-new-col-${ayah.i}`}
              name="newCollectionName"
              aria-label="Nama koleksi baru"
              type="text"
              maxLength={60}
              value={newColName}
              onInput={(e) => setNewColName((e.target as HTMLInputElement).value)}
              placeholder="Nama koleksi baru (mis. Doa)"
              class="h-9 flex-1 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
            />
            <Button size="sm" type="submit" disabled={!newColName.trim()}>
              Buat
            </Button>
          </form>
        </div>
      </Modal>

      {/* Hifz Range Modal */}
      <Modal
        open={hifzOpen}
        onClose={() => setHifzOpen(false)}
        title="Tandai hafalan"
        description={`Pilih rentang ayat ${surahName} yang sudah kamu hafal.`}
      >
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs font-medium text-[var(--muted-foreground)]">
              Dari ayat
              <input
                id={`ayah-hifz-from-${ayah.i}`}
                name="hifzFrom"
                type="number"
                min={1}
                max={maxSurahAyah}
                value={hifzFrom}
                onInput={(e) => setHifzFrom(Number((e.target as HTMLInputElement).value))}
                class="mt-1 h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] tabular-nums"
              />
            </label>
            <label class="text-xs font-medium text-[var(--muted-foreground)]">
              Sampai ayat
              <input
                id={`ayah-hifz-to-${ayah.i}`}
                name="hifzTo"
                type="number"
                min={1}
                max={maxSurahAyah}
                value={hifzTo}
                onInput={(e) => setHifzTo(Number((e.target as HTMLInputElement).value))}
                class="mt-1 h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] tabular-nums"
              />
            </label>
          </div>
          <p class="text-xs text-[var(--muted-foreground)]">
            {hifzFrom <= hifzTo && hifzFrom >= 1 && hifzTo <= maxSurahAyah
              ? `${hifzTo - hifzFrom + 1} ayat. Murajaah pertama dijadwalkan besok.`
              : `Pilih ayat 1 sampai ${maxSurahAyah} dengan ayat awal tidak melebihi ayat akhir.`}
          </p>
          <div class="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setHifzOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              disabled={!(hifzFrom >= 1 && hifzTo <= maxSurahAyah && hifzFrom <= hifzTo)}
              onClick={() => {
                addHifzRange({ surahId: ayah.surahId, fromAyah: hifzFrom, toAyah: hifzTo });
                setHifzOpen(false);
              }}
            >
              Simpan hafalan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Image Modal */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Bagikan sebagai gambar"
        description="Gambar dibuat langsung di perangkatmu tanpa diunggah ke server."
      >
        <div class="space-y-4">
          <div class="flex flex-wrap gap-3 text-xs">
            <div class="space-y-1">
              <p class="font-medium text-[var(--muted-foreground)]">Gaya</p>
              <div class="flex gap-1">
                {(['terang', 'gelap', 'polos'] as ShareStyle[]).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={shareStyle === st ? 'primary' : 'outline'}
                    onClick={() => setShareStyle(st)}
                  >
                    {st[0].toUpperCase() + st.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div class="space-y-1">
              <p class="font-medium text-[var(--muted-foreground)]">Ukuran</p>
              <div class="flex gap-1">
                <Button
                  size="sm"
                  variant={shareSize === 'square' ? 'primary' : 'outline'}
                  onClick={() => setShareSize('square')}
                >
                  Persegi
                </Button>
                <Button
                  size="sm"
                  variant={shareSize === 'story' ? 'primary' : 'outline'}
                  onClick={() => setShareSize('story')}
                >
                  Story
                </Button>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 text-xs">
            <label class="inline-flex items-center gap-1.5">
              <input
                id={`ayah-share-ar-${ayah.i}`}
                name="shareArabic"
                type="checkbox"
                checked={shareAr}
                onChange={(e) => {
                  const v = (e.target as HTMLInputElement).checked;
                  if (v || shareTr) setShareAr(v);
                }}
              />
              Arab
            </label>
            <label class="inline-flex items-center gap-1.5">
              <input
                id={`ayah-share-lat-${ayah.i}`}
                name="shareLatin"
                type="checkbox"
                checked={shareLat}
                onChange={(e) => setShareLat((e.target as HTMLInputElement).checked)}
              />
              Latin
            </label>
            <label class="inline-flex items-center gap-1.5">
              <input
                id={`ayah-share-tr-${ayah.i}`}
                name="shareTranslation"
                type="checkbox"
                checked={shareTr}
                onChange={(e) => {
                  const v = (e.target as HTMLInputElement).checked;
                  if (v || shareAr) setShareTr(v);
                }}
              />
              Terjemahan
            </label>
          </div>

          <div class="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-3">
            {shareBusy || !sharePreviewUrl ? (
              <p class="py-12 text-xs text-[var(--muted-foreground)]">Menyiapkan gambar…</p>
            ) : (
              <img
                src={sharePreviewUrl}
                alt={`Pratinjau gambar QS. ${surahName}:${ayah.n}`}
                class="max-h-72 rounded-lg border border-[var(--border)] object-contain"
              />
            )}
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShareOpen(false)}>
              Tutup
            </Button>
            <Button size="sm" disabled={!sharePreviewUrl} onClick={downloadShareImage}>
              <Download class="size-4" />
              Unduh gambar
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
}
