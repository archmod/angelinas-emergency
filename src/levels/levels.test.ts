import { describe, expect, it } from 'vitest';
import { getEnemyDef } from '@/config/enemies';
import { findPathWorld } from '@/core/grid/astar';
import { Grid } from '@/core/grid/Grid';
import type { Rect } from '@/core/level/schema';
import { LEVELS } from './registry';

const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Every shipped level must parse and be completable: spawn → each spot → exit, and patrols must be walkable. */
describe.each(LEVELS.map((l) => [l.id, l] as const))('level %s', (_id, entry) => {
  const data = entry.load();
  const grid = new Grid(data.width, data.height, data.tileSize, data.flags);

  it('has a walkable spawn, at least one poop spot and (if required) an exit', () => {
    expect(grid.isWalkable(...Object.values(grid.worldToTile(data.playerSpawn)) as [number, number])).toBe(true);
    expect(data.poopSpots.length).toBeGreaterThan(0);
    if (data.rules.exitRequired) expect(data.exit).not.toBeNull();
  });

  it('every poop spot is reachable from spawn and can reach the exit', () => {
    for (const spot of data.poopSpots) {
      expect(findPathWorld(grid, data.playerSpawn, center(spot.rect)).length, `spawn → ${spot.id}`).toBeGreaterThan(0);
      if (data.exit) expect(findPathWorld(grid, center(spot.rect), center(data.exit)).length, `${spot.id} → exit`).toBeGreaterThan(0);
    }
  });

  it('enemies have known kinds and walkable, connected patrol routes', () => {
    for (const e of data.enemies) {
      expect(() => getEnemyDef(e.kind)).not.toThrow();
      const t = grid.worldToTile(e.pos);
      expect(grid.isWalkable(t.x, t.y), `${e.id} spawn`).toBe(true);
      for (let i = 1; i < e.patrol.length; i++) {
        expect(findPathWorld(grid, e.patrol[i - 1]!, e.patrol[i]!).length, `${e.id} leg ${i}`).toBeGreaterThan(0);
      }
      if (e.patrolMode === 'stationary') expect(e.patrol.length).toBeLessThanOrEqual(1);
    }
  });
});
