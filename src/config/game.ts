import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { BootScene } from '@/game/scenes/BootScene';
import { PreloadScene } from '@/game/scenes/PreloadScene';
import { MainMenuScene } from '@/game/scenes/MainMenuScene';
import { GameScene } from '@/game/scenes/GameScene';
import { HudScene } from '@/game/scenes/HudScene';
import { LevelSelectScene } from '@/game/scenes/LevelSelectScene';
import { PauseScene } from '@/game/scenes/PauseScene';
import { ResultScene } from '@/game/scenes/ResultScene';

/**
 * Phaser game configuration.
 * - FIT + CENTER_BOTH: one logical 1280x720 space on every device (letterboxed), so stealth sight
 *   ranges and HUD layout are identical on phone and desktop.
 * - Arcade physics with a fixed 60 Hz step so gameplay is deterministic even when iOS Low Power
 *   Mode caps requestAnimationFrame at 30 fps.
 * - activePointers: 3 → joystick + two buttons can be touched at the same time.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  title: "Angelina's Emergency",
  backgroundColor: '#1b1b24',
  banner: false,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      fps: 60,
      fixedStep: true,
      debug: false,
    },
  },
  input: {
    activePointers: 3,
    touch: { capture: true },
    keyboard: true,
    mouse: true,
    gamepad: false,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  fps: { target: 60, smoothStep: true },
  scene: [BootScene, PreloadScene, MainMenuScene, LevelSelectScene, GameScene, HudScene, PauseScene, ResultScene],
};
