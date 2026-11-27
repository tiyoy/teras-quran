import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.resolve('public/icons');
await fs.mkdir(OUT_DIR, { recursive: true });

// Standard Rehal SVG (matches public/favicon.svg, rounded corners for "any" icons)
const standardSvg = await fs.readFile(path.resolve('public/favicon.svg'), 'utf8');

// Full-bleed flat Biru Safir SVG with safe-zone padding (80% inner logo) for maskable & Apple Touch icons
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0F52BA"/>
  <g transform="translate(50 50) scale(0.72) translate(-50 -56)">
    <defs>
      <mask id="gap" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <rect width="100" height="100" fill="#fff"/>
        <path d="M50 53.5L52.2 55.7L55.3 55.7L55.3 58.8L57.5 61L55.3 63.2L55.3 66.3L52.2 66.3L50 68.5L47.8 66.3L44.7 66.3L44.7 63.2L42.5 61L44.7 58.8L44.7 55.7L47.8 55.7Z" fill="#000" stroke="#000" stroke-width="5" stroke-linejoin="round"/>
      </mask>
    </defs>
    <g mask="url(#gap)">
      <path d="M18 39L50 61L82 39M50 61L31 83M50 61L69 83" fill="none" stroke="#F7FAFF" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M47.5 50.5L22 33C22 28.5 24.5 25.5 28.5 26C36 27 42.5 30.5 47.5 35.5Z" fill="#F7FAFF"/>
      <path d="M52.5 50.5L78 33C78 28.5 75.5 25.5 71.5 26C64 27 57.5 30.5 52.5 35.5Z" fill="#F7FAFF"/>
    </g>
    <path d="M50 53.5L52.2 55.7L55.3 55.7L55.3 58.8L57.5 61L55.3 63.2L55.3 66.3L52.2 66.3L50 68.5L47.8 66.3L44.7 66.3L44.7 63.2L42.5 61L44.7 58.8L44.7 55.7L47.8 55.7Z" fill="#C6922E"/>
  </g>
</svg>`;

const targets = [
  { file: 'icon-192.png', size: 192, svg: standardSvg },
  { file: 'icon-512.png', size: 512, svg: standardSvg },
  { file: 'icon-maskable-512.png', size: 512, svg: maskableSvg },
  { file: 'apple-touch-icon.png', size: 180, svg: maskableSvg },
];

for (const t of targets) {
  await sharp(Buffer.from(t.svg))
    .resize(t.size, t.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, t.file));
  console.log(`Generated ${t.file} (${t.size}x${t.size})`);
}
