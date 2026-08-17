import type { Ctx } from './canvas';
import { drawAngelinaPortrait, drawMenuBackdrop, drawPoop } from './sprites';

/**
 * App icon (PWA / apple-touch): Angelina's face with the cheeky poop mascot on the menus' chocolate backdrop.
 * Composed in a 512-unit square and scaled to `size`. `maskable` keeps the subject inside the maskable-icon safe
 * zone (the centred circle of 80% diameter) while the backdrop stays full-bleed.
 * Phaser-free on purpose: `scripts/gen-icons.mjs` rasterises this in headless Chromium.
 */
export function drawAppIcon(ctx: Ctx, size: number, opts: { maskable?: boolean } = {}): void {
  const U = 512;
  drawMenuBackdrop(ctx, size, size);
  ctx.save();
  ctx.scale(size / U, size / U);
  if (opts.maskable) {
    // shrink + re-centre the subject (its visual centre sits low-right of the square because of the poop)
    ctx.translate(U / 2, U / 2);
    ctx.scale(0.7, 0.7);
    ctx.translate(-268, -300);
  }
  // Angelina, big, a little left of centre; the bust runs off the bottom edge
  drawAngelinaPortrait(ctx, 16, 48, 430, 473, { lookX: 5, lookY: 3 });
  // poop mascot, tilted, at her shoulder (bottom-right, clear of the iOS squircle corner)
  ctx.save();
  ctx.translate(382, 380);
  ctx.rotate(-0.12);
  drawPoop(ctx, -115, -115, { size: 230 });
  ctx.restore();
  ctx.restore();
}
