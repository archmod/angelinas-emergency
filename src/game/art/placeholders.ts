import Phaser from 'phaser';
import { TILE_DEFS, TILE_KIND_COUNT, TILE_SIZE, TileKind } from '@/config/tiles';
import { TEX } from './AssetKeys';

/**
 * Generates every placeholder texture with Graphics → generateTexture. Called once from PreloadScene.
 * When real art arrives, PreloadScene loads PNG/atlas files under the same TEX keys and skips this.
 */
export function generatePlaceholderTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.TILESET)) return; // already generated (scene restart)
  generateTileset(scene);
  generatePlayer(scene);
  generateEnemy(scene);
  generatePoop(scene);
  generateSpots(scene);
  generateUi(scene);
}

const darken = (color: number, f: number): number => {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(c.red * f, c.green * f, c.blue * f);
};

function generateTileset(scene: Phaser.Scene): void {
  const T = TILE_SIZE;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let kind = 0; kind < TILE_KIND_COUNT; kind++) {
    const def = TILE_DEFS[kind as keyof typeof TILE_DEFS];
    const x0 = kind * T;
    g.fillStyle(def.color, 1);
    g.fillRect(x0, 0, T, T);
    switch (kind) {
      case TileKind.GRASS: // sparse blades
        g.fillStyle(darken(def.color, 0.85), 1);
        for (const [dx, dy] of [
          [6, 8],
          [20, 5],
          [12, 22],
          [25, 18],
          [3, 27],
        ] as const) {
          g.fillRect(x0 + dx, dy, 2, 4);
        }
        break;
      case TileKind.PATH: // pebbles
        g.fillStyle(darken(def.color, 0.9), 1);
        g.fillCircle(x0 + 9, 10, 2);
        g.fillCircle(x0 + 22, 20, 2.5);
        g.fillCircle(x0 + 15, 26, 1.5);
        break;
      case TileKind.FLOOR: // tile grout
        g.lineStyle(1, darken(def.color, 0.85), 1);
        g.strokeRect(x0 + 0.5, 0.5, T - 1, T - 1);
        break;
      case TileKind.WALL: // bricks
        g.fillStyle(darken(def.color, 0.8), 1);
        g.fillRect(x0, 15, T, 2);
        g.fillRect(x0 + 15, 0, 2, 15);
        g.fillRect(x0 + 7, 17, 2, 15);
        g.lineStyle(2, darken(def.color, 0.6), 1);
        g.strokeRect(x0 + 1, 1, T - 2, T - 2);
        break;
      case TileKind.FENCE: // planks
        g.fillStyle(darken(def.color, 0.75), 1);
        g.fillRect(x0 + 4, 4, 6, T - 8);
        g.fillRect(x0 + 13, 4, 6, T - 8);
        g.fillRect(x0 + 22, 4, 6, T - 8);
        g.fillRect(x0, 10, T, 3);
        g.fillRect(x0, 20, T, 3);
        break;
      case TileKind.BUSH: // leafy blobs
        g.fillStyle(darken(def.color, 1.25), 1);
        g.fillCircle(x0 + 10, 12, 8);
        g.fillCircle(x0 + 21, 11, 7);
        g.fillCircle(x0 + 16, 21, 9);
        g.fillStyle(darken(def.color, 0.8), 1);
        g.fillCircle(x0 + 12, 22, 3);
        break;
      case TileKind.WATER: // ripples
        g.lineStyle(2, darken(def.color, 1.3), 1);
        g.beginPath();
        g.moveTo(x0 + 4, 12);
        g.lineTo(x0 + 12, 12);
        g.moveTo(x0 + 16, 22);
        g.lineTo(x0 + 26, 22);
        g.strokePath();
        break;
      case TileKind.TREE: // trunk + canopy over grass
        g.fillStyle(TILE_DEFS[TileKind.GRASS].color, 1);
        g.fillRect(x0, 0, T, T);
        g.fillStyle(0x5a3a22, 1);
        g.fillCircle(x0 + 16, 16, 5);
        g.fillStyle(def.color, 1);
        g.fillCircle(x0 + 16, 16, 14);
        g.fillStyle(darken(def.color, 1.3), 1);
        g.fillCircle(x0 + 12, 12, 5);
        break;
      case TileKind.LOCKER: // metal door with vents
        g.lineStyle(2, darken(def.color, 0.6), 1);
        g.strokeRect(x0 + 3, 2, T - 6, T - 4);
        g.fillStyle(darken(def.color, 0.6), 1);
        g.fillRect(x0 + 9, 8, 14, 2);
        g.fillRect(x0 + 9, 12, 14, 2);
        g.fillCircle(x0 + 22, 22, 1.5);
        break;
    }
  }
  g.generateTexture(TEX.TILESET, TILE_KIND_COUNT * T, T);
  g.destroy();
}

function generatePlayer(scene: Phaser.Scene): void {
  // 40x40, drawn facing +x. Angelina: pink head, brown hair at the back, a small nose notch in front.
  const s = 40;
  const c = s / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x5a3a22, 1); // hair (back half, slightly larger)
  g.fillCircle(c - 3, c, 13);
  g.fillStyle(0xff7ab6, 1); // head
  g.fillCircle(c, c, 12);
  g.fillStyle(0x1b1b24, 1); // eyes toward the front
  g.fillCircle(c + 5, c - 5, 1.8);
  g.fillCircle(c + 5, c + 5, 1.8);
  g.fillStyle(0xff9fcb, 1); // nose notch marks facing
  g.fillTriangle(c + 11, c - 4, c + 17, c, c + 11, c + 4);
  g.generateTexture(TEX.PLAYER, s, s);
  g.destroy();
}

function generateEnemy(scene: Phaser.Scene): void {
  // White base so per-enemy tint gives each kind its color; drawn facing +x.
  const s = 40;
  const c = s / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(c, c, 12);
  g.fillStyle(0x000000, 0.35); // hat brim / back shading
  g.fillCircle(c - 4, c, 9);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(c - 2, c, 8);
  g.fillStyle(0x1b1b24, 1);
  g.fillCircle(c + 5, c - 5, 1.8);
  g.fillCircle(c + 5, c + 5, 1.8);
  g.fillTriangle(c + 11, c - 4, c + 17, c, c + 11, c + 4);
  g.generateTexture(TEX.ENEMY, s, s);
  g.destroy();
}

function generatePoop(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x7a4a1d, 1);
  g.fillCircle(14, 20, 9);
  g.fillCircle(14, 13, 7);
  g.fillCircle(14, 7, 4.5);
  g.fillStyle(0x9a6a3d, 1);
  g.fillCircle(11, 17, 2);
  g.generateTexture(TEX.POOP, 28, 28);
  g.destroy();
}

function generateSpots(scene: Phaser.Scene): void {
  const T = TILE_SIZE;
  const mk = (key: string, color: number, dashed: boolean) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 0.28);
    g.fillRoundedRect(2, 2, T - 4, T - 4, 6);
    g.lineStyle(2, color, 0.9);
    if (dashed) {
      for (let i = 4; i < T - 4; i += 8) {
        g.lineBetween(i, 3, Math.min(i + 4, T - 4), 3);
        g.lineBetween(i, T - 3, Math.min(i + 4, T - 4), T - 3);
        g.lineBetween(3, i, 3, Math.min(i + 4, T - 4));
        g.lineBetween(T - 3, i, T - 3, Math.min(i + 4, T - 4));
      }
    } else {
      g.strokeRoundedRect(2, 2, T - 4, T - 4, 6);
    }
    g.generateTexture(key, T, T);
    g.destroy();
  };
  mk(TEX.SPOT_HIDDEN, 0x7ee787, false);
  mk(TEX.SPOT_EXPOSED, 0xffd166, true);
  mk(TEX.EXIT, 0x7ab6ff, false);
}

function generateUi(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // joystick base 160x160
  g.fillStyle(0xffffff, 0.12);
  g.fillCircle(80, 80, 78);
  g.lineStyle(3, 0xffffff, 0.35);
  g.strokeCircle(80, 80, 78);
  g.generateTexture(TEX.JOYSTICK_BASE, 160, 160);
  g.clear();
  // thumb 72x72
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(36, 36, 34);
  g.generateTexture(TEX.JOYSTICK_THUMB, 72, 72);
  g.clear();
  // button 128x128 (white, tinted per button)
  g.fillStyle(0xffffff, 0.22);
  g.fillCircle(64, 64, 62);
  g.lineStyle(4, 0xffffff, 0.6);
  g.strokeCircle(64, 64, 62);
  g.generateTexture(TEX.BUTTON, 128, 128);
  g.destroy();
}
