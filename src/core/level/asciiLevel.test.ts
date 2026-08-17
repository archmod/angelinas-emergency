import { describe, expect, it } from 'vitest';
import { TileFlag, TileKind } from '@/config/tiles';
import { Grid } from '@/core/grid/Grid';
import { parseAsciiLevel, type AsciiLevelDef } from './asciiLevel';
import { LevelParseError } from './schema';

const meta = { id: 'test', world: 'park' as const, name: 'Test', parSeconds: 60, urgencySeconds: 90 };

const base = (): AsciiLevelDef => ({
  meta,
  map: [
    '##########',
    '#P..a...b#',
    '#.BB.=~T.#',
    '#S...XX..#',
    '#$$.c..?L#',
    '#%.......#',
    '##########',
  ],
  enemies: [
    { kind: 'ranger', patrol: 'ab' },
    { kind: 'benchLady', at: 'c', scanDeg: [0, 180] },
  ],
});

describe('parseAsciiLevel', () => {
  it('produces grid dimensions, layers and flags', () => {
    const lvl = parseAsciiLevel(base(), 32);
    expect(lvl.width).toBe(10);
    expect(lvl.height).toBe(7);
    const g = new Grid(lvl.width, lvl.height, 32, lvl.flags);
    expect(g.isSolid(0, 0)).toBe(true); // wall
    expect(g.isOccluding(0, 0)).toBe(true);
    expect(g.isSolid(1, 1)).toBe(false); // player tile
    expect(g.isSolid(5, 2)).toBe(true); // fence: solid, not occluding
    expect(g.isOccluding(5, 2)).toBe(false);
    expect(g.isSolid(6, 2)).toBe(true); // water
    expect(g.isSolid(7, 2)).toBe(true); // tree: solid + occluding
    expect(g.isOccluding(7, 2)).toBe(true);
    expect(g.isSolid(2, 2)).toBe(false); // bush walkable
    expect(g.isHiding(2, 2)).toBe(true);
    expect(g.isOccluding(2, 2)).toBe(true);
    expect(g.isHiding(8, 4)).toBe(true); // locker
    expect(g.isHiding(1, 3)).toBe(true); // hidden poop spot hides
    expect(lvl.ground[1 * 10 + 2]).toBe(TileKind.GRASS);
    expect(lvl.walls[0]).toBe(TileKind.WALL);
    expect(lvl.cover[2 * 10 + 2]).toBe(TileKind.BUSH);
    expect(lvl.cover[4 * 10 + 8]).toBe(TileKind.LOCKER);
    expect(lvl.ground[4 * 10 + 8]).toBe(TileKind.FLOOR);
    // out of bounds is solid+opaque
    expect(g.flagsAt(-1, 0) & TileFlag.SOLID).toBeTruthy();
  });

  it('places player, exit and poop spots in world px (tile centers / rects)', () => {
    const lvl = parseAsciiLevel(base(), 32);
    expect(lvl.playerSpawn.x).toBe(1.5 * 32);
    expect(lvl.playerSpawn.y).toBe(1.5 * 32);
    expect(lvl.exit).toEqual({ x: 5 * 32, y: 3 * 32, w: 2 * 32, h: 32 });
    const hidden = lvl.poopSpots.filter((s) => s.cover === 'hidden');
    const exposed = lvl.poopSpots.filter((s) => s.cover === 'exposed');
    expect(hidden).toHaveLength(2);
    expect(hidden[0]).toMatchObject({ id: 'spot-hidden-0', rect: { x: 32, y: 3 * 32, w: 32, h: 32 }, required: true, durationMultiplier: 1 });
    expect(hidden[1]).toMatchObject({ id: 'spot-hidden-1', rect: { x: 7 * 32, y: 4 * 32, w: 32, h: 32 }, required: false });
    expect(exposed).toHaveLength(2);
    expect(exposed[0]).toMatchObject({ id: 'spot-exposed-0', rect: { x: 32, y: 4 * 32, w: 64, h: 32 }, required: true, durationMultiplier: 0.7 });
    expect(exposed[1]).toMatchObject({ id: 'spot-exposed-1', rect: { x: 32, y: 5 * 32, w: 32, h: 32 }, required: false });
    expect(lvl.rules).toEqual({ exitRequired: true });
    const g = new Grid(lvl.width, lvl.height, 32, lvl.flags);
    expect(g.isHiding(7, 4)).toBe(true); // optional hidden spot hides too
    expect(g.isHiding(1, 5)).toBe(false); // exposed spots don't
  });

  it('requires at least one required spot (S or $)', () => {
    expect(() => parseAsciiLevel({ meta, map: ['P?%'] })).toThrow(/at least one required poop spot/);
    expect(() => parseAsciiLevel({ meta, map: ['P..'] })).toThrow(/at least one required poop spot/);
    expect(parseAsciiLevel({ meta, map: ['P$'] }).poopSpots).toHaveLength(1);
  });

  it('resolves enemy patrols and stationary posts from markers', () => {
    const lvl = parseAsciiLevel(base(), 32);
    expect(lvl.enemies).toHaveLength(2);
    const [ranger, lady] = lvl.enemies;
    expect(ranger!.patrol).toEqual([
      { x: 4.5 * 32, y: 1.5 * 32 },
      { x: 8.5 * 32, y: 1.5 * 32 },
    ]);
    expect(ranger!.pos).toEqual(ranger!.patrol[0]);
    expect(ranger!.patrolMode).toBe('loop');
    expect(ranger!.facingDeg).toBeCloseTo(0); // facing toward b (to the right)
    expect(lady!.patrolMode).toBe('stationary');
    expect(lady!.pos).toEqual({ x: 4.5 * 32, y: 4.5 * 32 });
    expect(lady!.scanDeg).toEqual([0, 180]);
  });

  it('drops exitRequired when the map has no exit', () => {
    const def = base();
    def.map[3] = '#S.......#';
    const lvl = parseAsciiLevel(def, 32);
    expect(lvl.exit).toBeNull();
    expect(lvl.rules.exitRequired).toBe(false);
  });

  it('treats spaces as void (solid + opaque) and pads ragged rows', () => {
    const lvl = parseAsciiLevel({ meta, map: ['PS', '.'] }, 32);
    const g = new Grid(lvl.width, lvl.height, 32, lvl.flags);
    expect(lvl.width).toBe(2);
    expect(g.isSolid(1, 1)).toBe(true);
    expect(g.isOccluding(1, 1)).toBe(true);
    expect(lvl.ground[3]).toBe(-1);
  });

  it('rejects bad input', () => {
    expect(() => parseAsciiLevel({ meta, map: ['..'] })).toThrow(LevelParseError);
    expect(() => parseAsciiLevel({ meta, map: ['P!'] })).toThrow(/unknown symbol/);
    expect(() => parseAsciiLevel({ meta, map: ['PP'] })).toThrow(/more than one player/);
    expect(() => parseAsciiLevel({ meta, map: ['Paa'] })).toThrow(/duplicate marker/);
    expect(() => parseAsciiLevel({ meta, map: ['PS'], enemies: [{ kind: 'x', patrol: 'z' }] })).toThrow(/unknown marker/);
    expect(() => parseAsciiLevel({ meta, map: ['PS'], enemies: [{ kind: 'x' }] })).toThrow(/needs 'patrol' or 'at'/);
    expect(() => parseAsciiLevel({ meta, map: ['PSX.X'] })).toThrow(/more than one exit/);
  });
});
