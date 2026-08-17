import { isIOS, isStandalone } from './ios';

const KEY = 'angelina.installHint.dismissed';

/**
 * iOS has no install prompt API: after a short delay, show a one-time DOM banner suggesting
 * "Share → Add to Home Screen" so the game runs fullscreen without Safari's bars.
 */
export function maybeShowInstallHint(delayMs = 4000): void {
  if (!isIOS() || isStandalone()) return;
  try {
    if (localStorage.getItem(KEY)) return;
  } catch {
    return;
  }
  window.setTimeout(() => {
    const el = document.createElement('div');
    el.id = 'install-hint';
    el.setAttribute('data-allow-touch', '');
    el.innerHTML =
      '<span>Tip: tap <b>Share</b> → <b>Add to Home Screen</b> to play fullscreen.</span><button type="button">Got it</button>';
    document.body.appendChild(el);
    el.querySelector('button')?.addEventListener('click', () => {
      try {
        localStorage.setItem(KEY, '1');
      } catch {
        /* ignore */
      }
      el.remove();
    });
  }, delayMs);
}
