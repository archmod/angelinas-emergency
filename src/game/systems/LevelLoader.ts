import Phaser from 'phaser';
import { DEPTH } from '@/config/constants';
import { TILE_DEFS, TileFlag } from '@/config/tiles';
import { Grid } from '@/core/grid/Grid';
import type { LevelData } from '@/core/level/schema';
import { groundTexture, TEX, TILESET_NAME } from '@/game/art/AssetKeys';
import { paintLevelGround } from '@/game/art/ground';

export interface BuiltLevel {
  data: LevelData;
  grid: Grid;
  map: Phaser.Tilemaps.Tilemap;
  /** Painted backdrop (one canvas texture per level) — grass/path/floor/water plus shadows. */
  ground: Phaser.GameObjects.Image;
  walls: Phaser.Tilemaps.TilemapLayer;
  cover: Phaser.Tilemaps.TilemapLayer;
  worldWidth: number;
  worldHeight: number;
}

/** Turns engine-agnostic LevelData into Phaser tilemap layers + a Grid for LOS/nav. */
export function buildLevel(scene: Phaser.Scene, data: LevelData): BuiltLevel {
  const { width, height, tileSize } = data;
  const map = scene.make.tilemap({ tileWidth: tileSize, tileHeight: tileSize, width, height });
  const tileset = map.addTilesetImage(TILESET_NAME, TEX.TILESET, tileSize, tileSize, 0, 0);
  if (!tileset) throw new Error('LevelLoader: tileset texture missing — was generatePlaceholderTextures() called?');

  const makeLayer = (name: string, indices: Int16Array, depth: number): Phaser.Tilemaps.TilemapLayer => {
    const layer = map.createBlankLayer(name, tileset, 0, 0, width, height, tileSize, tileSize);
    if (!layer) throw new Error(`LevelLoader: could not create layer ${name}`);
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const idx = indices[ty * width + tx] ?? -1;
        if (idx >= 0) layer.putTileAt(idx, tx, ty);
      }
    }
    layer.setDepth(depth);
    return layer;
  };

  const worldWidth = width * tileSize;
  const worldHeight = height * tileSize;
  const ground = paintGround(scene, data, worldWidth, worldHeight);
  // Water is on the walls layer for collision only; its tile is transparent and it is painted on the ground instead.
  const walls = makeLayer('walls', data.walls, DEPTH.DECOR);
  const cover = makeLayer('cover', data.cover, DEPTH.OVERHEAD);

  // Only tiles whose TileDef says SOLID collide (fence/water/wall/tree). Bushes/lockers don't.
  const solidKinds = Object.values(TILE_DEFS)
    .filter((d) => (d.flags & TileFlag.SOLID) !== 0)
    .map((d) => d.kind);
  walls.setCollision(solidKinds);
  // Cover is drawn above the player so she visibly ducks into bushes/lockers (but stays faintly visible).
  cover.setAlpha(0.8);

  const grid = new Grid(width, height, tileSize, data.flags);
  scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

  return { data, grid, map, ground, walls, cover, worldWidth, worldHeight };
}

/** Paints the level's ground into a canvas texture (downscaled if it would exceed the GPU's texture limit). */
function paintGround(scene: Phaser.Scene, data: LevelData, worldWidth: number, worldHeight: number): Phaser.GameObjects.Image {
  const key = groundTexture(data.meta.id);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer | Phaser.Renderer.Canvas.CanvasRenderer;
  const maxTex = 'getMaxTextureSize' in renderer ? renderer.getMaxTextureSize() : 4096;
  const scale = Math.min(1, maxTex / Math.max(worldWidth, worldHeight));
  const pxW = Math.ceil(worldWidth * scale);
  const pxH = Math.ceil(worldHeight * scale);
  const tex = scene.textures.createCanvas(key, pxW, pxH);
  if (!tex) throw new Error(`LevelLoader: could not create ground texture ${key}`);
  paintLevelGround(tex.getContext(), data, pxW, pxH, scale);
  tex.refresh();
  return scene.add.image(0, 0, key).setOrigin(0).setDisplaySize(worldWidth, worldHeight).setDepth(DEPTH.GROUND);
}
