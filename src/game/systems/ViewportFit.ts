import type Phaser from 'phaser';

/**
 * Keeps the Phaser canvas fitted to its parent element on iOS.
 *
 * Why this exists: on iOS the layout viewport can change without a matching `resize` event, or report stale sizes
 * when `orientationchange` / `resize` fire. It is worst for the home-screen (standalone) app, which always launches
 * in portrait: the rotate overlay pauses the game loop, which also stops the ScaleManager's own 500 ms parent-size
 * poll (it runs on PRE_STEP), and `ScaleManager.refresh()` on its own sizes the canvas from the *previous* parent
 * measurement (it only re-measures afterwards). A badly timed refresh therefore left the canvas at its portrait size
 * (~half the screen) until the next resize — which never came.
 *
 * Fix: re-measure the parent right before every refresh, drive refreshes from a ResizeObserver on the parent (fires
 * after layout, game loop or not, no window event needed) and re-check a few times after orientation / resize /
 * visibility events in case iOS applies the new size late.
 */
const RECHECK_DELAYS_MS = [0, 100, 300, 700, 1500];

/** Re-measures the scale parent, then refreshes: `refresh()` alone would reuse the last measurement. */
export function refitCanvas(game: Phaser.Game): void {
  const scale = game.scale;
  if (!scale.canvas) return; // not booted yet
  scale.getParentBounds();
  scale.refresh();
}

export function keepCanvasFitted(game: Phaser.Game): void {
  const refit = () => refitCanvas(game);

  const timers = new Set<number>();
  const recheck = () => {
    for (const t of timers) window.clearTimeout(t);
    timers.clear();
    for (const ms of RECHECK_DELAYS_MS) {
      const t = window.setTimeout(() => {
        timers.delete(t);
        refit();
      }, ms);
      timers.add(t);
    }
  };

  const parent = resolveParent(game);
  if (parent && 'ResizeObserver' in window) new ResizeObserver(refit).observe(parent);

  window.addEventListener('resize', recheck);
  window.addEventListener('orientationchange', recheck);
  screen.orientation?.addEventListener('change', recheck);
  window.matchMedia('(orientation: portrait)').addEventListener('change', recheck);
  window.addEventListener('pageshow', recheck);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') recheck();
  });
  game.events.once('ready', recheck);
}

const resolveParent = (game: Phaser.Game): Element | null => {
  const p = game.config.parent as unknown;
  if (p instanceof Element) return p;
  if (typeof p === 'string') return document.getElementById(p) ?? document.querySelector(p);
  return null;
};
