import { TileFlag } from '@/config/tiles';
import type { Vec2 } from '@/core/math/vec';

/**
 * Read-only view over a level's per-tile flags with world<->tile helpers.
 * Out-of-bounds tiles are treated as SOLID + OCCLUDE so nothing can walk or see off the map.
 */
export class Grid {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly tileSize: number,
    readonly flags: Uint8Array,
  ) {
    if (flags.length !== width * height) throw new Error(`Grid flags length ${flags.length} != ${width * height}`);
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  flagsAt(tx: number, ty: number): number {
    if (!this.inBounds(tx, ty)) return TileFlag.SOLID | TileFlag.OCCLUDE;
    return this.flags[ty * this.width + tx] ?? 0;
  }

  isSolid(tx: number, ty: number): boolean {
    return (this.flagsAt(tx, ty) & TileFlag.SOLID) !== 0;
  }
  isOccluding(tx: number, ty: number): boolean {
    return (this.flagsAt(tx, ty) & TileFlag.OCCLUDE) !== 0;
  }
  isHiding(tx: number, ty: number): boolean {
    return (this.flagsAt(tx, ty) & TileFlag.HIDE) !== 0;
  }
  isWalkable(tx: number, ty: number): boolean {
    return this.inBounds(tx, ty) && !this.isSolid(tx, ty);
  }

  worldToTile(p: Vec2): Vec2 {
    return { x: Math.floor(p.x / this.tileSize), y: Math.floor(p.y / this.tileSize) };
  }
  /** Center of tile (tx, ty) in world px. */
  tileToWorld(tx: number, ty: number): Vec2 {
    return { x: (tx + 0.5) * this.tileSize, y: (ty + 0.5) * this.tileSize };
  }
  get worldWidth(): number {
    return this.width * this.tileSize;
  }
  get worldHeight(): number {
    return this.height * this.tileSize;
  }

  /** Convenience: flags at a world position. */
  flagsAtWorld(p: Vec2): number {
    const t = this.worldToTile(p);
    return this.flagsAt(t.x, t.y);
  }
}
