import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { TEX } from '@/game/art/AssetKeys';

/** Chocolate gradient backdrop with a slowly drifting, faint poop-and-footprint pattern (menu screens). */
export function addMenuBackdrop(scene: Phaser.Scene): void {
  scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.MENU_BACKDROP).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  const pattern = scene.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, TEX.MENU_PATTERN);
  scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, dt: number) => {
    pattern.tilePositionX += dt * 0.008;
    pattern.tilePositionY += dt * 0.005;
  });
}
