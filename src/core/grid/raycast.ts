import { TileFlag } from '@/config/tiles';
import type { Vec2 } from '@/core/math/vec';
import type { Grid } from './Grid';

export interface RayHit {
  /** True if a blocking tile was hit before reaching the end point. */
  hit: boolean;
  /** World-space point where the ray stopped (the hit point, or `to` if clear). */
  point: Vec2;
  /** Tile that blocked the ray, if any. */
  tile: Vec2 | null;
  /** Distance travelled from `from` to `point`. */
  distance: number;
}

export type BlockPredicate = (flags: number) => boolean;
export const blocksSight: BlockPredicate = (f) => (f & TileFlag.OCCLUDE) !== 0;
export const blocksMovement: BlockPredicate = (f) => (f & TileFlag.SOLID) !== 0;

/**
 * Grid raycast (Amanatides–Woo DDA) from `from` toward `to` in world px.
 * Visits every tile the segment crosses; stops at the first tile for which `blocks(flags)` is true.
 * The starting tile is never considered blocking (an observer standing in a bush can still look out).
 */
export function castRay(grid: Grid, from: Vec2, to: Vec2, blocks: BlockPredicate = blocksSight): RayHit {
  const ts = grid.tileSize;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const totalLen = Math.hypot(dx, dy);
  if (totalLen === 0) return { hit: false, point: { ...to }, tile: null, distance: 0 };

  const dirX = dx / totalLen;
  const dirY = dy / totalLen;
  let tx = Math.floor(from.x / ts);
  let ty = Math.floor(from.y / ts);
  const endTx = Math.floor(to.x / ts);
  const endTy = Math.floor(to.y / ts);
  const stepX = dirX > 0 ? 1 : dirX < 0 ? -1 : 0;
  const stepY = dirY > 0 ? 1 : dirY < 0 ? -1 : 0;
  // Distance along the ray to the next vertical / horizontal grid line.
  const nextX = stepX > 0 ? (tx + 1) * ts : tx * ts;
  const nextY = stepY > 0 ? (ty + 1) * ts : ty * ts;
  let tMaxX = stepX !== 0 ? (nextX - from.x) / dirX : Infinity;
  let tMaxY = stepY !== 0 ? (nextY - from.y) / dirY : Infinity;
  const tDeltaX = stepX !== 0 ? ts / Math.abs(dirX) : Infinity;
  const tDeltaY = stepY !== 0 ? ts / Math.abs(dirY) : Infinity;

  // Guard against infinite loops on degenerate input.
  const maxSteps = grid.width + grid.height + 4;
  for (let i = 0; i < maxSteps; i++) {
    if (tx === endTx && ty === endTy) break;
    let t: number;
    if (tMaxX < tMaxY) {
      t = tMaxX;
      tMaxX += tDeltaX;
      tx += stepX;
    } else {
      t = tMaxY;
      tMaxY += tDeltaY;
      ty += stepY;
    }
    if (t > totalLen) break;
    if (blocks(grid.flagsAt(tx, ty))) {
      return {
        hit: true,
        point: { x: from.x + dirX * t, y: from.y + dirY * t },
        tile: { x: tx, y: ty },
        distance: t,
      };
    }
  }
  return { hit: false, point: { ...to }, tile: null, distance: totalLen };
}

/** Convenience: cast from a point along an angle for `maxLen` px. */
export function castRayAngle(grid: Grid, from: Vec2, angleRad: number, maxLen: number, blocks: BlockPredicate = blocksSight): RayHit {
  return castRay(grid, from, { x: from.x + Math.cos(angleRad) * maxLen, y: from.y + Math.sin(angleRad) * maxLen }, blocks);
}

/** True if nothing blocking lies between the two points. */
export function hasLineOfSight(grid: Grid, from: Vec2, to: Vec2, blocks: BlockPredicate = blocksSight): boolean {
  return !castRay(grid, from, to, blocks).hit;
}
