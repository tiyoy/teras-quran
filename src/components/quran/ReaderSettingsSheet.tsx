import { RotateCcw } from 'lucide-preact';
import {
  ARABIC_SIZE_LIMITS,
  LATIN_SIZE_LIMITS,
  TRANSLATION_SIZE_LIMITS,
  readerSettings,
  resetReaderSettings,
  updateReaderSettings,
} from '@/stores/reader-settings';
import { Button, Modal, Switch } from '@/components/ui/Primitives';

export function ReaderSettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const s = readerSettings.value;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tampilan bacaan"
      description="Ukuran teks Arab, Latin, terjemahan, warna tajwid, dan mode hafalan."
    >
      <div class="space-y-5 text-sm">
        {/* Live Preview */}
        <div class="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p
            class="quran-text text-right text-[var(--foreground)]"
            dir="rtl"
            lang="ar"
            style={{ fontSize: `${s.arabicSize}px` }}
          >
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
          </p>
          {s.showTransliteration && (
            <p
              style={{ fontSize: `${s.latinSize}px` }}
              class="mt-2 italic leading-relaxed text-[var(--muted-foreground)]"
            >
              Bismillāhir-raḥmānir-raḥīm
            </p>
          )}
          {s.showTranslation && (
            <p
              style={{ fontSize: `${s.translationSize}px` }}
              class="mt-1.5 leading-relaxed text-[var(--foreground)]"
            >
              {s.translationLang === 'en'
                ? 'In the name of Allah, the Entirely Merciful, the Especially Merciful.'
                : 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.'}
            </p>
          )}
        </div>

        {/* Font Size Sliders */}
        <div class="space-y-3.5">
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label for="reader-arabic-size" class="font-medium">
                Ukuran teks Arab
              </label>
              <span class="text-xs font-semibold tabular-nums text-[var(--primary)]">
                {s.arabicSize}px
              </span>
            </div>
            <input
              id="reader-arabic-size"
              type="range"
              min={ARABIC_SIZE_LIMITS.min}
              max={ARABIC_SIZE_LIMITS.max}
              step={ARABIC_SIZE_LIMITS.step}
              value={s.arabicSize}
              onInput={(e) =>
                updateReaderSettings({ arabicSize: Number((e.target as HTMLInputElement).value) })
              }
              class="w-full cursor-pointer"
            />
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label for="reader-latin-size" class="font-medium">
                Ukuran teks Latin
              </label>
              <span class="text-xs font-semibold tabular-nums text-[var(--primary)]">
                {s.latinSize}px
              </span>
            </div>
            <input
              id="reader-latin-size"
              type="range"
              min={LATIN_SIZE_LIMITS.min}
              max={LATIN_SIZE_LIMITS.max}
              step={LATIN_SIZE_LIMITS.step}
              value={s.latinSize}
              onInput={(e) =>
                updateReaderSettings({ latinSize: Number((e.target as HTMLInputElement).value) })
              }
              class="w-full cursor-pointer"
            />
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label for="reader-translation-size" class="font-medium">
                Ukuran teks Terjemahan
              </label>
              <span class="text-xs font-semibold tabular-nums text-[var(--primary)]">
                {s.translationSize}px
              </span>
            </div>
            <input
              id="reader-translation-size"
              type="range"
              min={TRANSLATION_SIZE_LIMITS.min}
              max={TRANSLATION_SIZE_LIMITS.max}
              step={TRANSLATION_SIZE_LIMITS.step}
              value={s.translationSize}
              onInput={(e) =>
                updateReaderSettings({
                  translationSize: Number((e.target as HTMLInputElement).value),
                })
              }
              class="w-full cursor-pointer"
            />
          </div>
        </div>

        {/* Tajwid */}
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-medium">Warna tajwid</p>
            <p class="text-xs text-[var(--muted-foreground)]">
              Teks Arab berwarna sesuai 12 hukum tajwid (rasm Utsmani).
            </p>
            <a
              href="/app/tajwid"
              class="mt-1 inline-block text-xs font-medium text-[var(--primary)] hover:underline"
            >
              Pelajari keterangan tajwid →
            </a>
          </div>
          <Switch
            checked={s.tajwid}
            onChange={(v) => updateReaderSettings({ tajwid: v })}
            label="Warna tajwid"
          />
        </div>

        {/* Translation */}
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium">Terjemahan</p>
              <p class="text-xs text-[var(--muted-foreground)]">Tampilkan arti ayat.</p>
            </div>
            <Switch
              checked={s.showTranslation}
              onChange={(v) => updateReaderSettings({ showTranslation: v })}
              label="Tampilkan terjemahan"
            />
          </div>
          {s.showTranslation && (
            <div class="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={s.translationLang === 'id' ? 'primary' : 'outline'}
                onClick={() => updateReaderSettings({ translationLang: 'id' })}
              >
                Indonesia
              </Button>
              <Button
                size="sm"
                variant={s.translationLang === 'en' ? 'primary' : 'outline'}
                onClick={() => updateReaderSettings({ translationLang: 'en' })}
              >
                English
              </Button>
            </div>
          )}
        </div>

        {/* Transliteration */}
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-medium">Transliterasi</p>
            <p class="text-xs text-[var(--muted-foreground)]">Tampilkan bacaan latin.</p>
          </div>
          <Switch
            checked={s.showTransliteration}
            onChange={(v) => updateReaderSettings({ showTransliteration: v })}
            label="Tampilkan transliterasi"
          />
        </div>

        {/* Hide Arabic / Hifz Mode */}
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-medium">Sembunyikan teks Arab (Mode hafalan)</p>
            <p class="text-xs text-[var(--muted-foreground)]">
              Teks Arab diburamkan sampai diketuk untuk melatih hafalan.
            </p>
          </div>
          <Switch
            checked={s.hideArabic}
            onChange={(v) => updateReaderSettings({ hideArabic: v })}
            label="Sembunyikan teks Arab"
          />
        </div>

        <div class="border-t border-[var(--border)] pt-3">
          <Button size="sm" variant="outline" onClick={resetReaderSettings}>
            <RotateCcw class="size-3.5" />
            Kembalikan bawaan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
