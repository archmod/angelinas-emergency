import type Phaser from 'phaser';
import { BALANCE } from '@/config/balance';

/** Sets up the main camera to follow the player inside the level bounds. */
export function setupCamera(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { x: number; y: number },
  worldWidth: number,
  worldHeight: number,
): Phaser.Cameras.Scene2D.Camera {
  const cam = scene.cameras.main;
  cam.setBounds(0, 0, worldWidth, worldHeight);
  cam.setZoom(BALANCE.camera.zoom);
  cam.startFollow(target, true, BALANCE.camera.lerp, BALANCE.camera.lerp);
  cam.setRoundPixels(true);
  return cam;
}
