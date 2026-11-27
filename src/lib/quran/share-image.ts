export type ShareStyle = 'terang' | 'gelap' | 'polos';
export type ShareSize = 'square' | 'story';

export interface ShareImageOptions {
  surahName: string;
  surahId: number;
  ayahNumber: number;
  arabic: string;
  latin: string;
  translation: string;
  translationLang: 'id' | 'en';
  style: ShareStyle;
  size: ShareSize;
  showArabic: boolean;
  showLatin: boolean;
  showTranslation: boolean;
}

const PALETTES: Record<
  ShareStyle,
  { bg: string; card: string; border: string; fg: string; muted: string; primary: string; gold: string }
> = {
  terang: {
    bg: '#F7F9FC',
    card: '#FFFFFF',
    border: '#DCE3EE',
    fg: '#0C1726',
    muted: '#52627A',
    primary: '#0F52BA',
    gold: '#C6922E',
  },
  gelap: {
    bg: '#080F1A',
    card: '#111C2E',
    border: '#1F2E47',
    fg: '#EAF0F8',
    muted: '#93A4BD',
    primary: '#5C9AFF',
    gold: '#DFB65B',
  },
  polos: {
    bg: '#FFFFFF',
    card: '#FFFFFF',
    border: '#DCE3EE',
    fg: '#0C1726',
    muted: '#52627A',
    primary: '#0F52BA',
    gold: '#C6922E',
  },
};

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders an ayah image onto an HTMLCanvasElement using strictly flat solid colors (zero gradients). */
export async function renderAyahShareBlob(opts: ShareImageOptions): Promise<Blob> {
  const width = 1080;
  const height = opts.size === 'story' ? 1920 : 1080;
  const pal = PALETTES[opts.style];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');

  // Solid flat background
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, width, height);

  const pad = 72;
  const cardX = pad;
  const cardY = pad;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;

  // Flat card container with 2px solid border
  ctx.fillStyle = pal.card;
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.stroke();

  // Top flat sapphire accent bar
  ctx.fillStyle = pal.primary;
  ctx.fillRect(cardX + 64, cardY + 56, 72, 6);

  // Reference badge
  ctx.fillStyle = pal.primary;
  ctx.font = '600 28px "Plus Jakarta Sans Variable", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`QS. ${opts.surahName} : ${opts.ayahNumber}`, cardX + 64, cardY + 112);

  const contentWidth = cardW - 128;
  const blocks: Array<{ lines: string[]; font: string; lineHeight: number; color: string; align: CanvasTextAlign }> = [];

  if (opts.showArabic) {
    const fontSize = opts.arabic.length > 260 ? 40 : opts.arabic.length > 140 ? 48 : 56;
    const font = `${fontSize}px "LPMQ", "Amiri Quran", serif`;
    ctx.font = font;
    blocks.push({
      lines: wrapLines(ctx, opts.arabic, contentWidth),
      font,
      lineHeight: Math.round(fontSize * 1.95),
      color: pal.fg,
      align: 'right',
    });
  }

  if (opts.showLatin && opts.latin) {
    const font = 'italic 26px "Plus Jakarta Sans Variable", system-ui, sans-serif';
    ctx.font = font;
    blocks.push({
      lines: wrapLines(ctx, opts.latin, contentWidth),
      font,
      lineHeight: 40,
      color: pal.muted,
      align: 'left',
    });
  }

  if (opts.showTranslation && opts.translation) {
    const fontSize = opts.translation.length > 280 ? 28 : 32;
    const font = `400 ${fontSize}px "Plus Jakarta Sans Variable", system-ui, sans-serif`;
    ctx.font = font;
    blocks.push({
      lines: wrapLines(ctx, opts.translation, contentWidth),
      font,
      lineHeight: Math.round(fontSize * 1.55),
      color: pal.fg,
      align: 'left',
    });
  }

  const totalTextHeight = blocks.reduce((acc, b, idx) => {
    return acc + b.lines.length * b.lineHeight + (idx > 0 ? 34 : 0);
  }, 0);

  const availableTop = cardY + 150;
  const availableBottom = cardY + cardH - 135;
  let y = Math.max(availableTop, availableTop + (availableBottom - availableTop - totalTextHeight) / 2);

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    if (bIdx > 0) y += 34;
    ctx.font = block.font;
    ctx.fillStyle = block.color;
    ctx.textAlign = block.align;
    const x = block.align === 'right' ? cardX + cardW - 64 : cardX + 64;
    for (const line of block.lines) {
      if (y > availableBottom) break;
      ctx.fillText(line, x, y);
      y += block.lineHeight;
    }
  }

  // Footer divider + Teras Qur'an branding
  const footerY = cardY + cardH - 72;
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 64, footerY - 36);
  ctx.lineTo(cardX + cardW - 64, footerY - 36);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = pal.muted;
  ctx.font = '500 22px "Plus Jakarta Sans Variable", system-ui, sans-serif';
  ctx.fillText(
    opts.translationLang === 'en' ? 'Translation: Saheeh International' : 'Terjemahan Kemenag RI',
    cardX + 64,
    footerY
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = pal.primary;
  ctx.font = '700 22px "Plus Jakarta Sans Variable", system-ui, sans-serif';
  ctx.fillText("Al-Qur'an Digital · Teras Qur'an", cardX + cardW - 64, footerY);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal menghasilkan gambar'));
    }, 'image/png');
  });
}
