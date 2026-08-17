import type Phaser from 'phaser';

/**
 * Shows the DOM "rotate your device" overlay while a touch device is held in portrait, and pauses
 * the game loop underneath it (saves battery, avoids input while the overlay covers the canvas).
 */
export function setupRotateOverlay(game: Phaser.Game): void {
  const overlay = document.getElementById('rotate-overlay');
  if (!overlay) return;

  const portraitTouch = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
  // The CSS media-query fallback handles the no-JS case; from here on JS owns visibility.
  overlay.classList.add('suppressed');

  let pausedByOverlay = false;
  const apply = () => {
    const show = portraitTouch.matches;
    overlay.classList.toggle('visible', show);
    if (show && !game.isPaused) {
      game.pause();
      pausedByOverlay = true;
    } else if (!show && pausedByOverlay) {
      game.resume();
      pausedByOverlay = false;
    }
    // Canvas re-fitting after the rotation is handled by systems/ViewportFit.ts (a bare `scale.refresh()` here
    // reused the stale parent size and could leave the canvas at its portrait size).
  };

  portraitTouch.addEventListener('change', apply);
  window.addEventListener('orientationchange', () => window.setTimeout(apply, 50));
  apply();
}
