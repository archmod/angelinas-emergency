import { findPathWorld } from '@/core/grid/astar';
import type { Grid } from '@/core/grid/Grid';
import type { Vec2 } from '@/core/math/vec';

/** Pathfinding + walkability queries in world space, backed by the level Grid. */
export class NavSystem {
  constructor(readonly grid: Grid) {}

  /** Smoothed world-space path from `from` to `to` (excludes `from` itself). [] if unreachable. */
  findPath(from: Vec2, to: Vec2): Vec2[] {
    const goal = this.nearestWalkable(to);
    if (!goal) return [];
    const path = findPathWorld(this.grid, from, goal);
    return path.length ? path.slice(1) : [];
  }

  isWalkableWorld(p: Vec2): boolean {
    const t = this.grid.worldToTile(p);
    return this.grid.isWalkable(t.x, t.y);
  }

  /** The point itself if walkable, otherwise the center of the nearest walkable tile within 3 tiles. */
  nearestWalkable(p: Vec2): Vec2 | null {
    if (this.isWalkableWorld(p)) return p;
    const t = this.grid.worldToTile(p);
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.grid.isWalkable(t.x + dx, t.y + dy)) return this.grid.tileToWorld(t.x + dx, t.y + dy);
        }
      }
    }
    return null;
  }

  /** Random walkable tile center within `radiusTiles` of `center` (falls back to center). */
  randomWalkableNear(center: Vec2, radiusTiles: number, rand: () => number = Math.random): Vec2 {
    const c = this.grid.worldToTile(center);
    for (let i = 0; i < 12; i++) {
      const tx = c.x + Math.round((rand() * 2 - 1) * radiusTiles);
      const ty = c.y + Math.round((rand() * 2 - 1) * radiusTiles);
      if (this.grid.isWalkable(tx, ty) && (tx !== c.x || ty !== c.y)) return this.grid.tileToWorld(tx, ty);
    }
    return this.nearestWalkable(center) ?? center;
  }
}
