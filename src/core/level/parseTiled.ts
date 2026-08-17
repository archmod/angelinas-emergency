import { TILE_DEFS, TILE_SIZE, TileFlag, type TileKindId } from '@/config/tiles';
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
  type WorldId,
} from './schema';

/**
 * Tiled (https://mapeditor.org) JSON map → LevelData. Optional authoring path; ASCII levels stay first-class.
 *
 * Expected map structure (orthogonal, finite, CSV layer data, embedded tileset):
 *   tile layers:   ground | walls | cover            (any may be missing)
 *   object layers: player  (one point object)
 *                  enemies (point objects; props: kind, patrol=<polyline name>, mode, facing, scanFrom, scanTo)
 *                  patrols (named polyline objects)
 *                  spots   (rects; class/type "hidden" | "exposed" or prop cover; prop duration)
 *                  hiding  (rects → HIDE, +OCCLUDE if prop occludes=true)
 *                  exit    (one rect)
 *   map props:     name, world, parSeconds, urgencySeconds, requiredPoops, exitRequired
 * Tile flags come from the placeholder tile kinds (index == TileKind) and can be overridden per tile
 * with boolean tile properties `collides`, `occludes`, `hides`.
 */

// --- Minimal Tiled JSON typings (only what we read) ---------------------------------------------
interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}
interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  class?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
  polyline?: { x: number; y: number }[];
  properties?: TiledProperty[];
}
interface TiledLayer {
  type: 'tilelayer' | 'objectgroup' | 'group' | 'imagelayer';
  name: string;
  data?: number[] | string;
  chunks?: unknown[];
  objects?: TiledObject[];
  layers?: TiledLayer[];
}
interface TiledTileset {
  firstgid: number;
  tiles?: { id: number; properties?: TiledProperty[] }[];
}
export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  infinite?: boolean;
  orientation?: string;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
  properties?: TiledProperty[];
}

const GID_FLAG_MASK = 0x1fffffff; // strip flip/rotate bits

const props = (list: TiledProperty[] | undefined): Record<string, unknown> => Object.fromEntries((list ?? []).map((p) => [p.name, p.value]));
const objClass = (o: TiledObject): string => o.class ?? o.type ?? '';

function flattenLayers(layers: TiledLayer[]): TiledLayer[] {
  return layers.flatMap((l) => (l.type === 'group' && l.layers ? flattenLayers(l.layers) : [l]));
}

export function parseTiledMap(map: TiledMap, meta: LevelMeta): LevelData {
  const id = meta.id;
  if (map.infinite) throw new LevelParseError(`${id}: infinite maps are not supported`);
  if (map.orientation && map.orientation !== 'orthogonal') throw new LevelParseError(`${id}: only orthogonal maps are supported`);
  const tileSize = map.tilewidth;
  if (map.tileheight !== tileSize) throw new LevelParseError(`${id}: tiles must be square`);
  const { width, height } = map;
  const n = width * height;
  const layers = flattenLayers(map.layers);
  const tileLayer = (name: string): TiledLayer | undefined => layers.find((l) => l.type === 'tilelayer' && l.name === name);
  const objLayer = (name: string): TiledObject[] => layers.find((l) => l.type === 'objectgroup' && l.name === name)?.objects ?? [];

  // Per-tile flag overrides from tileset tile properties.
  const tileset = map.tilesets[0];
  if (!tileset) throw new LevelParseError(`${id}: map has no tileset`);
  const firstgid = tileset.firstgid;
  const overrides = new Map<number, number>();
  for (const t of tileset.tiles ?? []) {
    const p = props(t.properties);
    if ('collides' in p || 'occludes' in p || 'hides' in p) {
      const base = TILE_DEFS[t.id as TileKindId]?.flags ?? 0;
      let f = base;
      if ('collides' in p) f = p.collides ? f | TileFlag.SOLID : f & ~TileFlag.SOLID;
      if ('occludes' in p) f = p.occludes ? f | TileFlag.OCCLUDE : f & ~TileFlag.OCCLUDE;
      if ('hides' in p) f = p.hides ? f | TileFlag.HIDE : f & ~TileFlag.HIDE;
      overrides.set(t.id, f);
    }
  }
  const flagsForIndex = (idx: number): number => overrides.get(idx) ?? TILE_DEFS[idx as TileKindId]?.flags ?? 0;

  const readLayer = (name: string): Int16Array => {
    const out = new Int16Array(n).fill(-1);
    const l = tileLayer(name);
    if (!l) return out;
    if (!Array.isArray(l.data)) throw new LevelParseError(`${id}: layer '${name}' must use CSV data (not base64)`);
    if (l.data.length !== n) throw new LevelParseError(`${id}: layer '${name}' has ${l.data.length} tiles, expected ${n}`);
    l.data.forEach((raw, i) => {
      const gid = raw & GID_FLAG_MASK;
      if (gid > 0) out[i] = gid - firstgid;
    });
    return out;
  };
  const ground = readLayer('ground');
  const walls = readLayer('walls');
  const cover = readLayer('cover');
  const flags = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let f = 0;
    if (walls[i]! >= 0) f |= flagsForIndex(walls[i]!);
    if (cover[i]! >= 0) f |= flagsForIndex(cover[i]!);
    if (ground[i]! < 0 && walls[i]! < 0 && cover[i]! < 0) f |= TileFlag.SOLID | TileFlag.OCCLUDE; // void
    flags[i] = f;
  }
  const rasterize = (r: Rect, add: number) => {
    const x0 = Math.max(0, Math.floor(r.x / tileSize));
    const y0 = Math.max(0, Math.floor(r.y / tileSize));
    const x1 = Math.min(width - 1, Math.ceil((r.x + r.w) / tileSize) - 1);
    const y1 = Math.min(height - 1, Math.ceil((r.y + r.h) / tileSize) - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) flags[y * width + x]! |= add;
  };
  const rectOf = (o: TiledObject): Rect => ({ x: o.x, y: o.y, w: o.width ?? tileSize, h: o.height ?? tileSize });

  // Player
  const players = objLayer('player');
  if (players.length !== 1) throw new LevelParseError(`${id}: expected exactly one object in layer 'player', found ${players.length}`);
  const pl = players[0]!;
  const playerSpawn = { x: pl.x, y: pl.y, facingDeg: Number(props(pl.properties).facing ?? 0) };

  // Patrols
  const patrols = new Map<string, Vec2[]>();
  for (const o of objLayer('patrols')) {
    if (!o.polyline || !o.name) continue;
    patrols.set(
      o.name,
      o.polyline.map((pt) => ({ x: o.x + pt.x, y: o.y + pt.y })),
    );
  }

  // Enemies
  const enemies: EnemySpawn[] = objLayer('enemies').map((o, i) => {
    const p = props(o.properties);
    const kind = String(p.kind ?? objClass(o) ?? '');
    if (!kind) throw new LevelParseError(`${id}: enemy object #${o.id} has no kind`);
    const eid = o.name || `${kind}-${i}`;
    let patrol: Vec2[] = [];
    if (typeof p.patrol === 'string' && p.patrol) {
      const pts = patrols.get(p.patrol);
      if (!pts) throw new LevelParseError(`${id}: enemy ${eid} references unknown patrol '${p.patrol}'`);
      patrol = pts;
    }
    const mode = (p.mode as PatrolMode | undefined) ?? (patrol.length > 0 ? 'loop' : 'stationary');
    const pos = patrol.length > 0 && mode !== 'stationary' ? patrol[0]! : { x: o.x, y: o.y };
    const scan: [number, number] | undefined = p.scanFrom !== undefined && p.scanTo !== undefined ? [Number(p.scanFrom), Number(p.scanTo)] : undefined;
    let facingDeg: number;
    if (p.facing !== undefined) facingDeg = Number(p.facing);
    else if (scan) facingDeg = (scan[0] + scan[1]) / 2;
    else facingDeg = patrol.length > 1 ? radToDeg(angleTo(patrol[0]!, patrol[1]!)) : 0;
    const spawn: EnemySpawn = { id: eid, kind, pos, facingDeg, patrol, patrolMode: mode };
    if (scan) spawn.scanDeg = scan;
    return spawn;
  });

  // Spots
  const poopSpots: PoopSpotDef[] = objLayer('spots').map((o, i) => {
    const p = props(o.properties);
    const cover = String(p.cover ?? objClass(o) ?? 'hidden') === 'exposed' ? 'exposed' : 'hidden';
    const rect = rectOf(o);
    if (cover === 'hidden') rasterize(rect, TileFlag.HIDE);
    return { id: o.name || `spot-${cover}-${i}`, rect, cover, durationMultiplier: Number(p.duration ?? (cover === 'hidden' ? 1 : 0.7)) };
  });

  // Hiding rects
  for (const o of objLayer('hiding')) {
    const p = props(o.properties);
    rasterize(rectOf(o), TileFlag.HIDE | (p.occludes ? TileFlag.OCCLUDE : 0));
  }

  // Exit
  const exits = objLayer('exit');
  if (exits.length > 1) throw new LevelParseError(`${id}: more than one exit`);
  const exit = exits[0] ? rectOf(exits[0]) : null;

  // Meta / rules from map properties
  const mp = props(map.properties);
  const finalMeta: LevelMeta = {
    id,
    world: (mp.world as WorldId | undefined) ?? meta.world,
    name: (mp.name as string | undefined) ?? meta.name,
    parSeconds: mp.parSeconds !== undefined ? Number(mp.parSeconds) : meta.parSeconds,
    urgencySeconds: mp.urgencySeconds !== undefined ? Number(mp.urgencySeconds) : meta.urgencySeconds,
  };
  const rules: LevelRules = { ...DEFAULT_RULES };
  if (mp.requiredPoops !== undefined) rules.requiredPoops = Number(mp.requiredPoops);
  if (mp.exitRequired !== undefined) rules.exitRequired = Boolean(mp.exitRequired);
  if (rules.exitRequired && !exit) rules.exitRequired = false;

  return { meta: finalMeta, tileSize: tileSize || TILE_SIZE, width, height, ground, walls, cover, flags, playerSpawn, enemies, poopSpots, exit, rules };
}
