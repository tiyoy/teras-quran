import { useEffect, useRef, useState } from 'preact/hooks';
import {
  CheckCircle2,
  CircleDot,
  Infinity as InfinityIcon,
  Lock,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  Vibrate,
  Volume2,
  VolumeX,
} from 'lucide-preact';
import { BADA_SHOLAT_STEPS, QUICK_TARGETS, type TasbihPreset } from '@/data/tasbih-presets';
import { computeProgressPercent } from '@/lib/tasbih/tasbih-logic';
import { addDaysToDateKey, formatDateKey } from '@/lib/quran/meta';
import {
  activeTasbihCounter,
  activeTasbihPreset,
  allTimeTasbihCount,
  deleteTasbihPreset,
  performTasbihTap,
  performTasbihUndo,
  resetActiveTasbih,
  selectTasbihMode,
  selectTasbihPreset,
  setActivePresetTarget,
  tasbihLogs,
  tasbihPrefs,
  tasbihPresets,
  tasbihState,
  todayTasbihCount,
  updateTasbihPrefs,
  upsertCustomTasbihPreset,
} from '@/stores/tasbih';
import { Badge, Button, Card, Modal, PageHeader, Switch } from '@/components/ui/Primitives';

const RING_RADIUS = 104;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function TasbihView() {
  const [pulse, setPulse] = useState(false);
  const [customTargetInput, setCustomTargetInput] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [formTitle, setFormTitle] = useState('');
  const [formArabic, setFormArabic] = useState('');
  const [formLatin, setFormLatin] = useState('');
  const [formMeaning, setFormMeaning] = useState('');
  const [formTarget, setFormTarget] = useState('33');
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const st = tasbihState.value;
  const prefs = tasbihPrefs.value;
  const preset = activeTasbihPreset.value;
  const counter = activeTasbihCounter.value;
  const isSequence = st.mode === 'bada-sholat';
  const seqState = st.badaSholat;
  const currentSeqStep = BADA_SHOLAT_STEPS[seqState.stepIndex] ?? BADA_SHOLAT_STEPS[0];

  const activeTitle = isSequence ? currentSeqStep.title : preset.title;
  const activeArabic = isSequence ? currentSeqStep.arabic : preset.arabic;
  const activeLatin = isSequence ? currentSeqStep.latin : preset.latin;
  const activeMeaning = isSequence ? currentSeqStep.meaning : preset.meaning;
  const activeCount = isSequence ? seqState.count : counter.count;
  const activeTarget = isSequence ? currentSeqStep.target : preset.target;
  const pct = computeProgressPercent(activeCount, activeTarget);
  const strokeOffset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;

  function triggerTap() {
    performTasbihTap();
    setPulse(true);
    setTimeout(() => setPulse(false), 110);
  }

  // Keyboard Space / Enter tap shortcut (only when no modal/input focused)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (formOpen || resetOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        triggerTap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen, resetOpen]);

  // Optional Screen Wake Lock
  useEffect(() => {
    if (!prefs.wakeLockEnabled) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request('screen')
      .then((wl) => (wakeLockRef.current = wl))
      .catch(() => {});
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [prefs.wakeLockEnabled]);

  function openAddModal() {
    setEditId(undefined);
    setFormTitle('');
    setFormArabic('');
    setFormLatin('');
    setFormMeaning('');
    setFormTarget('33');
    setFormOpen(true);
  }

  function openEditModal(p: TasbihPreset) {
    setEditId(p.id);
    setFormTitle(p.title);
    setFormArabic(p.arabic);
    setFormLatin(p.latin);
    setFormMeaning(p.meaning);
    setFormTarget(String(p.target));
    setFormOpen(true);
  }

  const todayKey = formatDateKey();
  const last7Logs = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysToDateKey(todayKey, i - 6);
    const [y, m, d] = key.split('-').map(Number);
    const label = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(
      new Date(y, m - 1, d)
    );
    return { key, label, count: tasbihLogs.value[key]?.totalCount ?? 0 };
  });

  return (
    <div class="space-y-6">
      <PageHeader
        title="Tasbih Digital"
        description="Penghitung dzikir dengan ketukan cepat, target jumlah custom, dan rangkaian dzikir ba'da sholat."
        actions={
          <Button size="sm" onClick={openAddModal}>
            <Plus class="size-4" />
            Tambah dzikir custom
          </Button>
        }
      />

      {/* Mode Selector: Dzikir Tunggal vs Rangkaian Ba'da Sholat */}
      <div class="grid grid-cols-2 rounded-xl bg-[var(--muted)] p-1">
        <button
          type="button"
          onClick={() => selectTasbihMode('single')}
          class={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
            !isSequence
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Dzikir Pilihan &amp; Custom
        </button>
        <button
          type="button"
          onClick={() => selectTasbihMode('bada-sholat')}
          class={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
            isSequence
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Rangkaian Ba&apos;da Sholat (100×)
        </button>
      </div>

      <div class="grid gap-5 lg:grid-cols-12">
        {/* MAIN TAP COUNTER STAGE */}
        <Card class="flex flex-col items-center p-5 sm:p-7 lg:col-span-7">
          {/* Sequence Stepper when in Ba'da Sholat mode */}
          {isSequence && (
            <div class="mb-4 flex w-full items-center justify-between gap-1.5">
              {BADA_SHOLAT_STEPS.map((step, i) => {
                const done = seqState.completed || i < seqState.stepIndex;
                const active = !seqState.completed && i === seqState.stepIndex;
                return (
                  <div
                    key={step.id}
                    class={`flex-1 rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold tabular-nums ${
                      done
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : active
                          ? 'border-[var(--primary)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                          : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {i + 1}. {step.target}×
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Dzikir Text */}
          <div class="mb-5 w-full text-center">
            <div class="mb-1 flex items-center justify-center gap-2">
              <Badge variant="primary">{activeTitle}</Badge>
              {!isSequence && (
                <Badge variant="default" class="tabular-nums">
                  Putaran ke-{counter.rounds + 1}
                </Badge>
              )}
              {isSequence && seqState.completed && (
                <Badge variant="success">
                  <CheckCircle2 class="size-3" />
                  Selesai 100×
                </Badge>
              )}
            </div>
            {activeArabic && (
              <p
                class="quran-text mt-2 text-center text-2xl text-[var(--foreground)] sm:text-3xl"
                dir="rtl"
                lang="ar"
              >
                {activeArabic}
              </p>
            )}
            {activeLatin && (
              <p class="mt-1 text-xs italic text-[var(--muted-foreground)]">{activeLatin}</p>
            )}
            {activeMeaning && (
              <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">{activeMeaning}</p>
            )}
          </div>

          {/* Flat Sapphire Circular Tap Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerTap();
            }}
            aria-label={`Ketuk untuk menghitung ${activeTitle}, hitungan saat ini ${activeCount}`}
            class={`relative flex size-60 select-none items-center justify-center rounded-full bg-[var(--background)] transition-transform duration-100 cursor-pointer active:scale-[0.97] sm:size-64 ${
              pulse ? 'scale-[0.98]' : 'scale-100'
            }`}
          >
            <svg viewBox="0 0 240 240" class="absolute inset-0 size-full -rotate-90" aria-hidden="true">
              <circle
                cx="120"
                cy="120"
                r={RING_RADIUS}
                fill="var(--card)"
                stroke="var(--border)"
                stroke-width="10"
              />
              {activeTarget > 0 && (
                <circle
                  cx="120"
                  cy="120"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--primary)"
                  stroke-width="10"
                  stroke-linecap="round"
                  stroke-dasharray={RING_CIRCUMFERENCE}
                  stroke-dashoffset={strokeOffset}
                  class="transition-[stroke-dashoffset] duration-150"
                />
              )}
            </svg>

            <div class="relative z-10 flex flex-col items-center text-center" aria-live="polite">
              <span class="text-6xl font-bold tracking-tight tabular-nums text-[var(--foreground)]">
                {activeCount}
              </span>
              <span class="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--muted-foreground)] tabular-nums">
                {activeTarget > 0 ? (
                  <>Target {activeTarget}</>
                ) : (
                  <>
                    <InfinityIcon class="size-4" /> Tanpa batas
                  </>
                )}
              </span>
              <span class="mt-2 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-foreground)]">
                Ketuk / Spasi
              </span>
            </div>
          </button>

          {/* Counter Controls Row */}
          <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={activeCount <= 0}
              onClick={performTasbihUndo}
              title="Kurangi 1 hitungan"
            >
              <Minus class="size-3.5" />
              −1
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (activeCount > 0 || (!isSequence && counter.rounds > 0) || (isSequence && seqState.totalTaps > 0)) {
                  setResetOpen(true);
                }
              }}
            >
              <RotateCcw class="size-3.5" />
              Reset
            </Button>

            <Button
              size="sm"
              variant={prefs.soundEnabled ? 'secondary' : 'outline'}
              onClick={() => updateTasbihPrefs({ soundEnabled: !prefs.soundEnabled })}
              title="Suara ketukan"
            >
              {prefs.soundEnabled ? <Volume2 class="size-3.5" /> : <VolumeX class="size-3.5" />}
              Suara
            </Button>

            <Button
              size="sm"
              variant={prefs.hapticEnabled ? 'secondary' : 'outline'}
              onClick={() => updateTasbihPrefs({ hapticEnabled: !prefs.hapticEnabled })}
              title="Getar haptik"
            >
              <Vibrate class="size-3.5" />
              Getar
            </Button>

            <Button
              size="sm"
              variant={prefs.wakeLockEnabled ? 'secondary' : 'outline'}
              onClick={() => updateTasbihPrefs({ wakeLockEnabled: !prefs.wakeLockEnabled })}
              title="Jaga layar tetap menyala"
            >
              {prefs.wakeLockEnabled ? <Lock class="size-3.5" /> : <Unlock class="size-3.5" />}
              Layar nyala
            </Button>
          </div>

          {/* Custom Target Controls (for single dzikir mode) */}
          {!isSequence && (
            <div class="mt-6 w-full space-y-3 border-t border-[var(--border)] pt-5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Target jumlah dzikir
                </p>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-[var(--muted-foreground)]">Putaran otomatis</span>
                  <Switch
                    checked={prefs.autoNextRound}
                    onChange={(v) => updateTasbihPrefs({ autoNextRound: v })}
                    label="Lanjut putaran baru otomatis"
                  />
                </div>
              </div>

              <div class="flex flex-wrap gap-1.5">
                {QUICK_TARGETS.map((num) => (
                  <Button
                    key={num}
                    size="sm"
                    variant={preset.target === num ? 'primary' : 'outline'}
                    onClick={() => setActivePresetTarget(num)}
                    class="tabular-nums"
                  >
                    {num === 0 ? 'Tanpa batas' : `${num}×`}
                  </Button>
                ))}
              </div>

              <form
                class="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = Number(customTargetInput);
                  if (Number.isFinite(val) && val >= 1 && val <= 10_000) {
                    setActivePresetTarget(val);
                    setCustomTargetInput('');
                  }
                }}
              >
                <input
                  id="tasbih-custom-target"
                  name="customTarget"
                  type="number"
                  aria-label="Target custom dzikir"
                  min={1}
                  max={10000}
                  value={customTargetInput}
                  onInput={(e) => setCustomTargetInput((e.target as HTMLInputElement).value)}
                  placeholder="Atur target custom bebas (1–10.000, mis. 70)…"
                  class="h-9 flex-1 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-xs tabular-nums focus:border-[var(--primary)] focus:outline-none"
                />
                <Button size="sm" type="submit" variant="secondary" disabled={!customTargetInput}>
                  Terapkan
                </Button>
              </form>
            </div>
          )}
        </Card>

        {/* SIDE PANEL: Dzikir List & Stats */}
        <div class="space-y-4 lg:col-span-5">
          {/* Today & All-time Stats */}
          <div class="grid grid-cols-2 gap-3">
            <Card class="p-4">
              <p class="text-xs text-[var(--muted-foreground)]">Dzikir hari ini</p>
              <p class="mt-1 text-2xl font-bold tabular-nums text-[var(--primary)]">
                {todayTasbihCount.value.toLocaleString('id-ID')}
              </p>
            </Card>
            <Card class="p-4">
              <p class="text-xs text-[var(--muted-foreground)]">Total tercatat</p>
              <p class="mt-1 text-2xl font-bold tabular-nums text-[var(--foreground)]">
                {allTimeTasbihCount.value.toLocaleString('id-ID')}
              </p>
            </Card>
          </div>

          {/* Preset & Custom Dzikir List */}
          <Card class="p-4">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold">Daftar bacaan dzikir</h2>
              <button
                type="button"
                onClick={openAddModal}
                class="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                + Custom
              </button>
            </div>

            <div class="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {tasbihPresets.value.map((p) => {
                const isSelected = !isSequence && preset.id === p.id;
                const c = st.counters[p.id];
                return (
                  <div
                    key={p.id}
                    class={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectTasbihPreset(p.id)}
                      class="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <p class="truncate text-sm font-semibold text-[var(--foreground)]">
                        {p.title}
                      </p>
                      <p class="text-[11px] text-[var(--muted-foreground)] tabular-nums">
                        Target: {p.target === 0 ? 'Tanpa batas' : `${p.target}×`}
                        {c?.sessionTotal ? ` · Sesi: ${c.sessionTotal}` : ''}
                      </p>
                    </button>
                    <div class="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        aria-label={`Ubah ${p.title}`}
                        class="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)] cursor-pointer"
                      >
                        <Pencil class="size-3.5" />
                      </button>
                      {!p.isDefault && (
                        <button
                          type="button"
                          onClick={() => deleteTasbihPreset(p.id)}
                          aria-label={`Hapus ${p.title}`}
                          class="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--destructive)] cursor-pointer"
                        >
                          <Trash2 class="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 7-Day Mini Log */}
          <Card class="p-4">
            <h3 class="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              <CircleDot class="size-3.5 text-[var(--primary)]" />
              Riwayat 7 hari terakhir
            </h3>
            <div class="grid grid-cols-7 gap-1.5 text-center">
              {last7Logs.map((d) => (
                <div
                  key={d.key}
                  class="rounded-lg border border-[var(--border)] bg-[var(--background)] py-2"
                >
                  <p class="text-[10px] text-[var(--muted-foreground)]">{d.label}</p>
                  <p class="mt-0.5 text-xs font-bold tabular-nums text-[var(--foreground)]">
                    {d.count}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Reset Confirm Modal */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset hitungan tasbih?"
        description="Pilih apakah hanya mengulang hitungan saat ini ke 0 atau mereset putaran sesi juga."
      >
        <div class="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setResetOpen(false)}>
            Batal
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              resetActiveTasbih(false);
              setResetOpen(false);
            }}
          >
            Reset hitungan saja
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              resetActiveTasbih(true);
              setResetOpen(false);
            }}
          >
            Reset semua sesi
          </Button>
        </div>
      </Modal>

      {/* Add / Edit Custom Dzikir Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Ubah dzikir' : 'Tambah dzikir custom'}
        description="Atur teks bacaan dan jumlah target dzikir sesuai kebutuhanmu."
      >
        <form
          class="space-y-3.5 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const saved = upsertCustomTasbihPreset({
              id: editId,
              title: formTitle,
              arabic: formArabic,
              latin: formLatin,
              meaning: formMeaning,
              target: Number(formTarget || 0),
            });
            if (saved) setFormOpen(false);
          }}
        >
          <div>
            <label for="tasbih-form-title" class="mb-1 block text-xs font-medium">Nama dzikir *</label>
            <input
              id="tasbih-form-title"
              name="title"
              type="text"
              required
              maxLength={60}
              value={formTitle}
              onInput={(e) => setFormTitle((e.target as HTMLInputElement).value)}
              placeholder="Mis. Hawqalah, Shalawat Jibril"
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
            />
          </div>

          <div>
            <label for="tasbih-form-target" class="mb-1 block text-xs font-medium">Target jumlah dzikir (0 = tanpa batas)</label>
            <input
              id="tasbih-form-target"
              name="target"
              type="number"
              min={0}
              max={10000}
              value={formTarget}
              onInput={(e) => setFormTarget((e.target as HTMLInputElement).value)}
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm tabular-nums"
            />
          </div>

          <div>
            <label for="tasbih-form-arabic" class="mb-1 block text-xs font-medium">Teks Arab (opsional)</label>
            <input
              id="tasbih-form-arabic"
              name="arabic"
              type="text"
              dir="rtl"
              lang="ar"
              value={formArabic}
              onInput={(e) => setFormArabic((e.target as HTMLInputElement).value)}
              placeholder="لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ"
              class="quran-text h-11 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-right text-lg"
            />
          </div>

          <div>
            <label for="tasbih-form-latin" class="mb-1 block text-xs font-medium">Bacaan Latin (opsional)</label>
            <input
              id="tasbih-form-latin"
              name="latin"
              type="text"
              value={formLatin}
              onInput={(e) => setFormLatin((e.target as HTMLInputElement).value)}
              placeholder="Lā ḥaula wa lā quwwata illā billāh"
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
            />
          </div>

          <div>
            <label for="tasbih-form-meaning" class="mb-1 block text-xs font-medium">Arti singkat (opsional)</label>
            <input
              id="tasbih-form-meaning"
              name="meaning"
              type="text"
              value={formMeaning}
              onInput={(e) => setFormMeaning((e.target as HTMLInputElement).value)}
              placeholder="Tiada daya dan upaya melainkan dengan pertolongan Allah"
              class="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button size="sm" type="submit" disabled={!formTitle.trim()}>
              Simpan dzikir
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
