import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TileFlag, TileKind } from '@/config/tiles';
import { Grid } from '@/core/grid/Grid';
import { parseTiledMap, type TiledMap } from './parseTiled';
import { LevelParseError } from './schema';

const fixture = JSON.parse(readFileSync(new URL('../../../test/fixtures/tiled-min.tmj', import.meta.url), 'utf8')) as TiledMap;
const meta = { id: 'fixture', world: 'park' as const, name: 'X', parSeconds: 60, urgencySeconds: 90 };

describe('parseTiledMap', () => {
  const lvl = parseTiledMap(fixture, meta);
  const grid = new Grid(lvl.width, lvl.height, lvl.tileSize, lvl.flags);

  it('reads dimensions, layers (gid - firstgid) and derives flags from tile kinds', () => {
    expect([lvl.width, lvl.height, lvl.tileSize]).toEqual([6, 5, 32]);
    expect(lvl.ground[0]).toBe(TileKind.GRASS);
    expect(lvl.ground[2 * 6 + 1]).toBe(TileKind.PATH);
    expect(lvl.walls[0]).toBe(TileKind.WALL);
    expect(grid.isSolid(0, 0)).toBe(true);
    expect(grid.isOccluding(0, 0)).toBe(true);
    expect(lvl.walls[2 * 6 + 2]).toBe(TileKind.FENCE);
    expect(grid.isSolid(2, 2)).toBe(true);
    // fence (id 4) has occludes=true override in the tileset
    expect(grid.isOccluding(2, 2)).toBe(true);
    expect(lvl.walls[3 * 6 + 4]).toBe(TileKind.WATER);
    expect(grid.isOccluding(4, 3)).toBe(false);
    expect(lvl.cover[1 * 6 + 3]).toBe(TileKind.BUSH);
    expect(grid.isHiding(3, 1)).toBe(true);
    // void tile (no layer at all) is solid+opaque
    expect(grid.flagsAt(5, 4) & (TileFlag.SOLID | TileFlag.OCCLUDE)).toBe(TileFlag.SOLID | TileFlag.OCCLUDE);
  });

  it('reads player, patrols, enemies (kind/patrol/mode/scan), spots and exit', () => {
    expect(lvl.playerSpawn).toEqual({ x: 48, y: 48, facingDeg: 0 });
    expect(lvl.enemies).toHaveLength(2);
    const [ranger, cam] = lvl.enemies;
    expect(ranger!.id).toBe('ranger-main');
    expect(ranger!.kind).toBe('ranger');
    expect(ranger!.patrol).toEqual([
      { x: 48, y: 112 },
      { x: 112, y: 112 },
    ]);
    expect(ranger!.pos).toEqual({ x: 48, y: 112 });
    expect(ranger!.patrolMode).toBe('pingpong');
    expect(cam!.kind).toBe('camera');
    expect(cam!.patrolMode).toBe('stationary');
    expect(cam!.pos).toEqual({ x: 144, y: 48 });
    expect(cam!.scanDeg).toEqual([90, 180]);
    expect(lvl.poopSpots).toHaveLength(2);
    expect(lvl.poopSpots[0]).toMatchObject({ cover: 'hidden', rect: { x: 32, y: 96, w: 32, h: 32 }, durationMultiplier: 1 });
    expect(lvl.poopSpots[1]).toMatchObject({ cover: 'exposed', durationMultiplier: 0.5 });
    expect(grid.isHiding(1, 3)).toBe(true); // hidden spot rasterized to HIDE
    expect(lvl.exit).toEqual({ x: 128, y: 32, w: 32, h: 32 });
  });

  it('applies map properties to meta and rules', () => {
    expect(lvl.meta.name).toBe('Fixture Park');
    expect(lvl.meta.parSeconds).toBe(45);
    expect(lvl.meta.urgencySeconds).toBe(90); // from registry meta (not in map)
    expect(lvl.rules).toEqual({ requiredPoops: 2, exitRequired: true });
  });

  it('rejects unsupported maps', () => {
    expect(() => parseTiledMap({ ...fixture, infinite: true }, meta)).toThrow(LevelParseError);
    const noPlayer = { ...fixture, layers: fixture.layers.filter((l) => l.name !== 'player') };
    expect(() => parseTiledMap(noPlayer, meta)).toThrow(/exactly one object in layer 'player'/);
    const badPatrol = JSON.parse(JSON.stringify(fixture)) as TiledMap;
    const enemies = badPatrol.layers.find((l) => l.name === 'enemies')!.objects!;
    enemies[0]!.properties!.find((p) => p.name === 'patrol')!.value = 'nope';
    expect(() => parseTiledMap(badPatrol, meta)).toThrow(/unknown patrol/);
  });
});
