import { TILE_DEFS, TILE_SIZE, TileFlag, TileKind, type TileKindId } from '@/config/tiles';
import type { Vec2 } from '@/core/math/vec';
import { angleTo, radToDeg } from '@/core/math/vec';
import {
  DEFAULT_RULES,
  LevelParseError,
  type EnemySpawn,
  type LevelData,
  type LevelMeta,
  type LevelRules,
  type PatrolMode,
  type PoopSpotDef,
  type Rect,
} from './schema';

/**
 * ASCII level format — quick to author in code/tests, no external editor needed.
 *
 * Legend (one char per tile):
 *   #  wall          .  grass         ,  path          _  floor (indoor)
 *   =  fence         ~  water         T  tree          B  bush (hides, blocks sight, walkable)
 *   L  locker (hides, blocks sight, walkable)
 *   P  player spawn  X  exit zone
 *   S  required poop spot (hidden cover)   $  required poop spot (exposed)
 *   ?  optional poop spot (hidden cover)   %  optional poop spot (exposed)
 *   a-z  named waypoint markers referenced by `enemies[].patrol` / `enemies[].at`
 *   ' ' (space) void: not part of the map (solid + opaque, not drawn)
 * Ground under P/X/spots/markers/B/L is `defaultGround` (grass unless set).
 * Spots are single-use. Every required spot (S/$) must be pooped in to open the exit — a level needs at least one;
 * optional spots (?/%) are bonus relief that doesn't count. Adjacent same-symbol cells merge into one spot.
 */
export interface AsciiEnemyDef {
  kind: string;
  /** Marker letters in patrol order, e.g. "abcd". */
  patrol?: string;
  /** Single marker for stationary enemies. */
  at?: string;
  mode?: PatrolMode;
  facingDeg?: number;
  scanDeg?: [number, number];
}

export interface AsciiLevelDef {
  meta: LevelMeta;
  map: string[];
  enemies?: AsciiEnemyDef[];
  rules?: Partial<LevelRules>;
  defaultGround?: 'grass' | 'path' | 'floor';
}

const GROUND_KIND: Record<NonNullable<AsciiLevelDef['defaultGround']>, TileKindId> = {
  grass: TileKind.GRASS,
  path: TileKind.PATH,
  floor: TileKind.FLOOR,
};

interface CellSpec {
  ground?: TileKindId | 'default';
  walls?: TileKindId;
  cover?: TileKindId;
  extraFlags?: number;
}

const CELLS: Record<string, CellSpec> = {
  '#': { walls: TileKind.WALL },
  '.': { ground: TileKind.GRASS },
  ',': { ground: TileKind.PATH },
  _: { ground: TileKind.FLOOR },
  '=': { ground: 'default', walls: TileKind.FENCE },
  '~': { walls: TileKind.WATER },
  T: { ground: 'default', walls: TileKind.TREE },
  B: { ground: 'default', cover: TileKind.BUSH },
  L: { ground: TileKind.FLOOR, cover: TileKind.LOCKER },
  P: { ground: 'default' },
  X: { ground: 'default' },
  S: { ground: 'default', extraFlags: TileFlag.HIDE },
  $: { ground: 'default' },
  '?': { ground: 'default', extraFlags: TileFlag.HIDE },
  '%': { ground: 'default' },
};

/** Poop-spot symbols → cover + whether the spot is one of the level's objectives. */
const SPOT_SYMBOLS: Record<string, { cover: PoopSpotDef['cover']; required: boolean }> = {
  S: { cover: 'hidden', required: true },
  $: { cover: 'exposed', required: true },
  '?': { cover: 'hidden', required: false },
  '%': { cover: 'exposed', required: false },
};

const isMarker = (ch: string): boolean => ch >= 'a' && ch <= 'z';

/** Bounding rectangles (tile units) of 4-connected components of the given cells. */
function groupCells(cells: Set<number>, width: number): { x: number; y: number; w: number; h: number }[] {
  const seen = new Set<number>();
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  for (const start of cells) {
    if (seen.has(start)) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const idx = stack.pop()!;
      const x = idx % width;
      const y = Math.floor(idx / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width) continue;
        const n = ny * width + nx;
        if (cells.has(n) && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    rects.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  }
  return rects;
}

export function parseAsciiLevel(def: AsciiLevelDef, tileSize: number = TILE_SIZE): LevelData {
  const rows = def.map;
  if (rows.length === 0) throw new LevelParseError(`${def.meta.id}: empty map`);
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const n = width * height;
  const ground = new Int16Array(n).fill(-1);
  const walls = new Int16Array(n).fill(-1);
  const cover = new Int16Array(n).fill(-1);
  const flags = new Uint8Array(n);
  const defaultGround = GROUND_KIND[def.defaultGround ?? 'grass'];

  const markers = new Map<string, Vec2>(); // tile coords
  const exitCells = new Set<number>();
  const spotCells = new Map<string, Set<number>>(); // spot symbol → cells
  let playerTile: Vec2 | null = null;

  const toWorld = (tx: number, ty: number): Vec2 => ({ x: (tx + 0.5) * tileSize, y: (ty + 0.5) * tileSize });
  const rectToWorld = (r: { x: number; y: number; w: number; h: number }): Rect => ({
    x: r.x * tileSize,
    y: r.y * tileSize,
    w: r.w * tileSize,
    h: r.h * tileSize,
  });

  for (let ty = 0; ty < height; ty++) {
    const row = rows[ty]!;
    for (let tx = 0; tx < width; tx++) {
      const ch = tx < row.length ? row[tx]! : ' ';
      const idx = ty * width + tx;
      if (ch === ' ') {
        flags[idx] = TileFlag.SOLID | TileFlag.OCCLUDE;
        continue;
      }
      let spec: CellSpec | undefined;
      if (isMarker(ch)) {
        if (markers.has(ch)) throw new LevelParseError(`${def.meta.id}: duplicate marker '${ch}'`);
        markers.set(ch, { x: tx, y: ty });
        spec = { ground: 'default' };
      } else {
        spec = CELLS[ch];
        if (!spec) throw new LevelParseError(`${def.meta.id}: unknown symbol '${ch}' at (${tx},${ty})`);
      }
      if (ch === 'P') {
        if (playerTile) throw new LevelParseError(`${def.meta.id}: more than one player spawn 'P'`);
        playerTile = { x: tx, y: ty };
      }
      if (ch === 'X') exitCells.add(idx);
      if (ch in SPOT_SYMBOLS) {
        if (!spotCells.has(ch)) spotCells.set(ch, new Set());
        spotCells.get(ch)!.add(idx);
      }

      let f = spec.extraFlags ?? 0;
      if (spec.ground !== undefined) ground[idx] = spec.ground === 'default' ? defaultGround : spec.ground;
      if (spec.walls !== undefined) {
        walls[idx] = spec.walls;
        f |= TILE_DEFS[spec.walls].flags;
      }
      if (spec.cover !== undefined) {
        cover[idx] = spec.cover;
        f |= TILE_DEFS[spec.cover].flags;
      }
      flags[idx] = f;
    }
  }

  if (!playerTile) throw new LevelParseError(`${def.meta.id}: missing player spawn 'P'`);

  const resolveMarker = (m: string, ctx: string): Vec2 => {
    const t = markers.get(m);
    if (!t) throw new LevelParseError(`${def.meta.id}: ${ctx} references unknown marker '${m}'`);
    return toWorld(t.x, t.y);
  };

  const enemies: EnemySpawn[] = (def.enemies ?? []).map((e, i) => {
    const id = `${e.kind}-${i}`;
    const patrol = (e.patrol ?? '').split('').map((m) => resolveMarker(m, `enemy ${id}`));
    let pos: Vec2;
    let mode: PatrolMode;
    if (e.at) {
      pos = resolveMarker(e.at, `enemy ${id}`);
      mode = e.mode ?? 'stationary';
    } else if (patrol.length > 0) {
      pos = patrol[0]!;
      mode = e.mode ?? 'loop';
    } else {
      throw new LevelParseError(`${def.meta.id}: enemy ${id} needs 'patrol' or 'at'`);
    }
    let facingDeg = e.facingDeg;
    if (facingDeg === undefined) {
      if (e.scanDeg) facingDeg = (e.scanDeg[0] + e.scanDeg[1]) / 2;
      else facingDeg = patrol.length > 1 ? radToDeg(angleTo(patrol[0]!, patrol[1]!)) : 0;
    }
    const spawn: EnemySpawn = { id, kind: e.kind, pos, facingDeg, patrol, patrolMode: mode };
    if (e.scanDeg) spawn.scanDeg = e.scanDeg;
    return spawn;
  });

  // Required spots first (hidden, then exposed), then optional ones; ids number each cover kind in that order.
  const poopSpots: PoopSpotDef[] = [];
  const spotIndex = { hidden: 0, exposed: 0 };
  for (const symbol of ['S', '$', '?', '%']) {
    const { cover, required } = SPOT_SYMBOLS[symbol]!;
    for (const r of groupCells(spotCells.get(symbol) ?? new Set(), width)) {
      poopSpots.push({ id: `spot-${cover}-${spotIndex[cover]++}`, rect: rectToWorld(r), cover, durationMultiplier: cover === 'hidden' ? 1 : 0.7, required });
    }
  }
  if (!poopSpots.some((s) => s.required)) throw new LevelParseError(`${def.meta.id}: needs at least one required poop spot ('S' or '$')`);

  const exitRects = groupCells(exitCells, width);
  if (exitRects.length > 1) throw new LevelParseError(`${def.meta.id}: more than one exit zone 'X' group`);
  const exit = exitRects[0] ? rectToWorld(exitRects[0]) : null;

  const rules: LevelRules = { ...DEFAULT_RULES, ...def.rules };
  if (rules.exitRequired && !exit) rules.exitRequired = false;

  return {
    meta: def.meta,
    tileSize,
    width,
    height,
    ground,
    walls,
    cover,
    flags,
    playerSpawn: { ...toWorld(playerTile.x, playerTile.y), facingDeg: 0 },
    enemies,
    poopSpots,
    exit,
    rules,
  };
}
