import type Phaser from 'phaser';
import { ENEMY_DEFS } from '@/config/enemies';
import { TILE_KIND_COUNT, TILE_SIZE } from '@/config/tiles';
import { SPOT_TEXTURE_SIZE, TEX, enemyTexture, walkAnim } from './AssetKeys';
import { circle, type Ctx } from './canvas';
import { drawAngelina, drawCamera, drawDog, drawPerson, drawPoop, drawSpot, drawStink, FRAME, WALK_FRAMES, type PersonLook } from './sprites';
import { drawTileset } from './tiles';

/** Distinct looks per enemy archetype (see config/enemies.ts). */
const LOOKS: Record<string, PersonLook> = {
  ranger: { skin: '#f1c27d', hair: '#4a3222', hairStyle: 'short', shirt: '#3d8b37', hat: 'ranger', hatColor: '#b89b5a', accessory: 'badge' },
  jogger: { skin: '#c68642', hair: '#2b1d14', hairStyle: 'headband', shirt: '#ff8c42', hat: 'none', accessory: 'none', accent: '#ffffff' },
  benchLady: { skin: '#f6d5b8', hair: '#d9d9d9', hairStyle: 'bun', shirt: '#b87fd9', hat: 'none', accessory: 'glasses' },
  neighbor: { skin: '#f1c27d', hair: '#e8b4d0', hairStyle: 'curlers', shirt: '#e0b0ff', hat: 'none', accessory: 'none', accent: '#ff9ad5' },
  mailCarrier: { skin: '#8d5524', hair: '#1f1a17', hairStyle: 'short', shirt: '#5aa9ff', hat: 'cap', hatColor: '#2f5fa8', accessory: 'bag', accent: '#3d6fb8' },
  teacher: { skin: '#f6d5b8', hair: '#4a2f22', hairStyle: 'bob', shirt: '#e05a5a', hat: 'none', accessory: 'glasses' },
  hallMonitor: { skin: '#c68642', hair: '#3b2a1a', hairStyle: 'short', shirt: '#4a4a5a', hat: 'cap', hatColor: '#ffb347', accessory: 'sash', accent: '#ffb347' },
  janitor: { skin: '#f1c27d', hair: '#7a7a7a', hairStyle: 'short', shirt: '#8fd3c1', hat: 'cap', hatColor: '#4a4f5a', accessory: 'mop' },
};

const fallbackLook = (color: number): PersonLook => ({ skin: '#f1c27d', hair: '#4a3222', hairStyle: 'short', shirt: `#${color.toString(16).padStart(6, '0')}`, hat: 'none', accessory: 'none' });

/**
 * Generates every texture in code (Canvas 2D → CanvasTexture) and registers walk animations.
 * Called once from PreloadScene. Real image assets could replace any key here without touching entities.
 */
export function generateArtTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.TILESET)) return; // already generated (scene restart)

  canvasTexture(scene, TEX.TILESET, TILE_KIND_COUNT * TILE_SIZE, TILE_SIZE, drawTileset);

  // Characters: horizontal strips of WALK_FRAMES frames.
  strip(scene, TEX.PLAYER, (ctx, i) => drawAngelina(ctx, i * FRAME, 0, i));
  for (const def of Object.values(ENEMY_DEFS)) {
    const key = enemyTexture(def.kind);
    if (def.kind === 'dog') strip(scene, key, (ctx, i) => drawDog(ctx, i * FRAME, 0, i));
    else if (def.kind === 'camera') strip(scene, key, (ctx, i) => drawCamera(ctx, i * FRAME, 0), 1);
    else {
      const look = LOOKS[def.kind] ?? fallbackLook(def.color);
      strip(scene, key, (ctx, i) => drawPerson(ctx, i * FRAME, 0, i, look));
    }
  }

  canvasTexture(scene, TEX.POOP, 64, 64, (ctx) => drawPoop(ctx, 0, 0));
  canvasTexture(scene, TEX.STINK, 48, 48, (ctx) => drawStink(ctx, 0, 0));
  const S = SPOT_TEXTURE_SIZE;
  canvasTexture(scene, TEX.SPOT_HIDDEN, S, S, (ctx) => drawSpot(ctx, 0, 0, 'hidden'));
  canvasTexture(scene, TEX.SPOT_EXPOSED, S, S, (ctx) => drawSpot(ctx, 0, 0, 'exposed'));
  canvasTexture(scene, TEX.EXIT, S, S, (ctx) => drawSpot(ctx, 0, 0, 'exit'));

  // UI: joystick + buttons
  canvasTexture(scene, TEX.JOYSTICK_BASE, 160, 160, (ctx) => {
    circle(ctx, 80, 80, 76, 'rgba(255,255,255,0.10)', { stroke: 'rgba(255,255,255,0.45)', lineWidth: 3 });
    circle(ctx, 80, 80, 40, 'rgba(255,255,255,0)', { stroke: 'rgba(255,255,255,0.18)', lineWidth: 2 });
  });
  canvasTexture(scene, TEX.JOYSTICK_THUMB, 72, 72, (ctx) => {
    circle(ctx, 36, 36, 33, 'rgba(255,255,255,0.55)', { stroke: 'rgba(255,255,255,0.8)', lineWidth: 2 });
  });
  canvasTexture(scene, TEX.BUTTON, 128, 128, (ctx) => {
    circle(ctx, 64, 64, 60, 'rgba(255,255,255,0.22)', { stroke: 'rgba(255,255,255,0.65)', lineWidth: 5 });
  });
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): Phaser.Textures.CanvasTexture {
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create canvas texture ${key}`);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);
  draw(ctx);
  tex.refresh();
  return tex;
}

/** Character strip texture with numbered frames 0..n-1 and a looping walk animation. */
function strip(scene: Phaser.Scene, key: string, drawFrame: (ctx: Ctx, i: number) => void, frames = WALK_FRAMES): void {
  const tex = canvasTexture(scene, key, FRAME * frames, FRAME, (ctx) => {
    for (let i = 0; i < frames; i++) drawFrame(ctx, i);
  });
  for (let i = 0; i < frames; i++) tex.add(i, 0, i * FRAME, 0, FRAME, FRAME);
  const anim = walkAnim(key);
  if (frames > 1 && !scene.anims.exists(anim)) {
    scene.anims.create({ key: anim, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }), frameRate: 10, repeat: -1 });
  }
}
