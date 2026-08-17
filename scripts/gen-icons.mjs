// Generates placeholder PWA / apple-touch icons with pngjs (no native deps).
// Usage: node scripts/gen-icons.mjs
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [0x1b, 0x1b, 0x24];
const PINK = [0xff, 0x7a, 0xb6];
const HAIR = [0x5a, 0x3a, 0x22];
const POOP = [0x7a, 0x4a, 0x1d];
const EYE = [0x1b, 0x1b, 0x24];

const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

function render(size, { padding = 0 } = {}) {
  const png = new PNG({ width: size, height: size });
  const s = size - padding * 2; // drawable square
  const o = padding;
  const cx = o + s * 0.5;
  const cy = o + s * 0.47;
  const headR = s * 0.28;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = BG;
      // hair: bigger circle behind head, shifted up
      if (inCircle(x, y, cx, cy - headR * 0.25, headR * 1.15) && y < cy) c = HAIR;
      if (inCircle(x, y, cx, cy, headR)) c = PINK;
      // eyes
      if (inCircle(x, y, cx - headR * 0.35, cy - headR * 0.05, headR * 0.09)) c = EYE;
      if (inCircle(x, y, cx + headR * 0.35, cy - headR * 0.05, headR * 0.09)) c = EYE;
      // poop swirl bottom-right: three stacked circles
      const px = o + s * 0.72;
      const py = o + s * 0.78;
      if (inCircle(x, y, px, py, s * 0.13) || inCircle(x, y, px, py - s * 0.11, s * 0.095) || inCircle(x, y, px, py - s * 0.2, s * 0.06)) c = POOP;
      const i = (y * size + x) * 4;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

const files = [
  ['apple-touch-icon-180.png', render(180)],
  ['icon-192.png', render(192)],
  ['icon-512.png', render(512)],
  ['icon-maskable-512.png', render(512, { padding: 64 })], // safe zone for maskable icons
];
for (const [name, buf] of files) {
  writeFileSync(join(outDir, name), buf);
  console.log('wrote', join('public/icons', name), buf.length, 'bytes');
}
