import type { Vec2 } from '@/core/math/vec';

export type WorldId = 'park' | 'neighborhood' | 'school';

export interface LevelMeta {
  id: string;
  world: WorldId;
  name: string;
  /** Target completion time for ranking. */
  parSeconds: number;
  /** Time until the urgency meter is full (accident). */
  urgencySeconds: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PatrolMode = 'loop' | 'pingpong' | 'stationary';

export interface EnemySpawn {
  id: string;
  /** Key into the EnemyDef table (config/enemies.ts). */
  kind: string;
  /** World-space spawn position (px). */
  pos: Vec2;
  facingDeg: number;
  /** World-space patrol waypoints (px). Empty for stationary enemies. */
  patrol: Vec2[];
  patrolMode: PatrolMode;
  /** For stationary enemies: sweep facing between these two angles (deg). */
  scanDeg?: [number, number];
}

export interface PoopSpotDef {
  id: string;
  rect: Rect;
  /** hidden = safe from vision except up close; exposed = visible but faster. */
  cover: 'hidden' | 'exposed';
  durationMultiplier: number;
  /**
   * Every spot is single-use (one poop, then it's spent). Required spots are the level's objectives: all of
   * them must be used before the exit opens. Optional spots are bonus relief valves that don't count.
   */
  required: boolean;
}

export interface LevelRules {
  /** If false, the level is won as soon as every required spot has been used. */
  exitRequired: boolean;
}

export const DEFAULT_RULES: LevelRules = { exitRequired: true };

/** The spots that must each be pooped in (once) to complete the level. */
export const requiredSpots = (spots: readonly PoopSpotDef[]): PoopSpotDef[] => spots.filter((s) => s.required);

/**
 * Engine-agnostic level description. Both the ASCII and Tiled loaders produce this; the Phaser
 * side (LevelLoader) only ever consumes it.
 */
export interface LevelData {
  meta: LevelMeta;
  tileSize: number;
  /** Size in tiles. */
  width: number;
  height: number;
  /** Tile-kind index per cell for each render layer; -1 = empty. Row-major, length width*height. */
  ground: Int16Array;
  walls: Int16Array;
  cover: Int16Array;
  /** TileFlag bitmask per cell (SOLID/OCCLUDE/HIDE). */
  flags: Uint8Array;
  playerSpawn: Vec2 & { facingDeg: number };
  enemies: EnemySpawn[];
  poopSpots: PoopSpotDef[];
  exit: Rect | null;
  rules: LevelRules;
}

export class LevelParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LevelParseError';
  }
}
