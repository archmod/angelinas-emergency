import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from '@/config/game';
import { setupRotateOverlay } from '@/game/ui/RotateOverlay';
import { maybeShowInstallHint } from '@/platform/installHint';
import { installBrowserGuards, installWakeLock } from '@/platform/ios';
import { registerServiceWorker } from '@/platform/pwa';

installBrowserGuards();
installWakeLock();

const game = new Phaser.Game(gameConfig);
setupRotateOverlay(game);

// Expose the game for browser smoke tests and on-device debugging (dev builds or ?debug=1).
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
  (window as Window & { __game?: Phaser.Game }).__game = game;
}

if (import.meta.env.PROD) registerServiceWorker();
maybeShowInstallHint();

// On-device console for iOS (no Safari Web Inspector on Linux): open with ?debug=1
if (new URLSearchParams(window.location.search).has('debug')) {
  void import('eruda').then((m) => m.default.init());
}
