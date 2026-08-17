// Renders the PWA / apple-touch icons from the game's own art code (src/game/art/icon.ts → drawAppIcon):
// esbuild bundles it for the browser, headless Chromium (Playwright, already a dev dependency) rasterises it.
// Usage: node scripts/gen-icons.mjs
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const bundle = await build({
  entryPoints: [join(root, 'src', 'game', 'art', 'icon.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'IconArt',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'silent',
});
const script = bundle.outputFiles[0].text;

const files = [
  ['apple-touch-icon-180.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>icons</title>');
  await page.addScriptTag({ content: script });
  for (const [name, size, maskable] of files) {
    const dataUrl = await page.evaluate(
      ([size, maskable]) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        IconArt.drawAppIcon(ctx, size, { maskable });
        return canvas.toDataURL('image/png');
      },
      [size, maskable],
    );
    const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    writeFileSync(join(outDir, name), buf);
    console.log('wrote', join('public/icons', name), buf.length, 'bytes');
  }
} finally {
  await browser.close();
}
