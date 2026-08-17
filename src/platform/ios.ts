/**
 * Browser/iOS Safari guards. Everything here is DOM-level and engine-agnostic.
 *
 * iOS ignores `user-scalable=no`, so pinch/double-tap zoom and rubber-band scrolling must be
 * prevented with `touch-action: none` (styles.css) plus these listeners.
 */

const isInteractiveDom = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  // Allow scrolling/selection inside our DOM debug tools (eruda console, debug panel).
  return Boolean(target.closest('.eruda-container, [data-allow-touch]'));
};

export function installBrowserGuards(): void {
  const prevent = (e: Event) => {
    if (!isInteractiveDom(e.target)) e.preventDefault();
  };
  // Pinch zoom (Safari-specific gesture events).
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('gesturechange', prevent, { passive: false });
  // Rubber-band / overscroll and two-finger scroll.
  document.addEventListener('touchmove', prevent, { passive: false });
  // Double-tap zoom on older WebKit builds.
  document.addEventListener('dblclick', prevent, { passive: false });
  // Long-press context menu (Phaser also disables it on the canvas).
  document.addEventListener('contextmenu', prevent);
  // Ctrl/Cmd + wheel zoom on desktop.
  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    },
    { passive: false },
  );
}

export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS 13+ reports as Macintosh but has touch points.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = (): boolean =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

/** Keeps the screen awake while playing (iOS 16.4+). Silently no-ops where unsupported. */
export function installWakeLock(): void {
  const nav = navigator as Navigator & {
    wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> };
  };
  if (!nav.wakeLock) return;
  let sentinel: { release(): Promise<void> } | null = null;
  const request = async () => {
    try {
      sentinel = await nav.wakeLock!.request('screen');
    } catch {
      /* denied (low battery, not visible) — ignore */
    }
  };
  // Must be triggered from a user gesture the first time.
  document.addEventListener('pointerdown', () => void request(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sentinel === null) void request();
    if (document.visibilityState === 'hidden') sentinel = null; // released automatically by the browser
  });
}
