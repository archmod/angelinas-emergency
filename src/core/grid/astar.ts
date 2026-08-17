import type { Vec2 } from '@/core/math/vec';
import type { Grid } from './Grid';
import { blocksMovement, hasLineOfSight } from './raycast';

/** Small binary min-heap keyed by f-score. */
class Heap {
  private items: { idx: number; f: number }[] = [];
  get size(): number {
    return this.items.length;
  }
  push(idx: number, f: number): void {
    const a = this.items;
    a.push({ idx, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.f <= a[i]!.f) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]!.f < a[m]!.f) m = l;
        if (r < a.length && a[r]!.f < a[m]!.f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top.idx;
  }
}

const SQRT2 = Math.SQRT2;
const octile = (dx: number, dy: number): number => {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return ax > ay ? ax + (SQRT2 - 1) * ay : ay + (SQRT2 - 1) * ax;
};

/**
 * A* on the tile grid. 8-directional, no corner cutting (a diagonal step requires both orthogonal
 * neighbours to be walkable), octile heuristic. Returns tile coordinates from start to goal
 * inclusive, or null if unreachable. Start/goal on solid tiles: start is allowed (an entity may be
 * nudged into a wall), goal must be walkable.
 */
export function findPathTiles(grid: Grid, start: Vec2, goal: Vec2, maxExpansions = 20000): Vec2[] | null {
  const w = grid.width;
  const h = grid.height;
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  const gx = Math.floor(goal.x);
  const gy = Math.floor(goal.y);
  if (!grid.inBounds(sx, sy) || !grid.isWalkable(gx, gy)) return null;
  if (sx === gx && sy === gy) return [{ x: sx, y: sy }];

  const n = w * h;
  const gScore = new Float64Array(n).fill(Infinity);
  const cameFrom = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const startIdx = sy * w + sx;
  const goalIdx = gy * w + gx;
  gScore[startIdx] = 0;
  const open = new Heap();
  open.push(startIdx, octile(gx - sx, gy - sy));

  let expansions = 0;
  while (open.size > 0) {
    const cur = open.pop();
    if (closed[cur]) continue;
    if (cur === goalIdx) break;
    closed[cur] = 1;
    if (++expansions > maxExpansions) return null;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.isWalkable(nx, ny)) continue;
        if (dx !== 0 && dy !== 0) {
          // no corner cutting
          if (!grid.isWalkable(cx + dx, cy) || !grid.isWalkable(cx, cy + dy)) continue;
        }
        const ni = ny * w + nx;
        if (closed[ni]) continue;
        const tentative = gScore[cur]! + (dx !== 0 && dy !== 0 ? SQRT2 : 1);
        if (tentative < gScore[ni]!) {
          gScore[ni] = tentative;
          cameFrom[ni] = cur;
          open.push(ni, tentative + octile(gx - nx, gy - ny));
        }
      }
    }
  }
  if (cameFrom[goalIdx] === -1) return null;

  const path: Vec2[] = [];
  for (let i = goalIdx; i !== -1; i = cameFrom[i]!) {
    path.push({ x: i % w, y: Math.floor(i / w) });
    if (i === startIdx) break;
  }
  path.reverse();
  return path;
}

/**
 * String-pulling: drops intermediate waypoints while the straight segment between the kept point and
 * the candidate has movement line-of-sight. Input/output are world-space points.
 */
export function smoothPath(grid: Grid, path: Vec2[]): Vec2[] {
  if (path.length <= 2) return path.slice();
  const out: Vec2[] = [path[0]!];
  let anchor = 0;
  for (let i = 2; i < path.length; i++) {
    if (!hasLineOfSight(grid, path[anchor]!, path[i]!, blocksMovement)) {
      out.push(path[i - 1]!);
      anchor = i - 1;
    }
  }
  out.push(path[path.length - 1]!);
  return out;
}

/**
 * Full pipeline in world px: A* from `from` to `to`, tile centers, first point replaced by `from`
 * itself, then smoothed. Returns [] when unreachable.
 */
export function findPathWorld(grid: Grid, from: Vec2, to: Vec2): Vec2[] {
  const startTile = grid.worldToTile(from);
  const goalTile = grid.worldToTile(to);
  const tiles = findPathTiles(grid, startTile, goalTile);
  if (!tiles) return [];
  const world = tiles.map((t) => grid.tileToWorld(t.x, t.y));
  world[0] = { ...from };
  // Land exactly on the requested point if it lies within the goal tile.
  world[world.length - 1] = { ...to };
  return smoothPath(grid, world);
}
