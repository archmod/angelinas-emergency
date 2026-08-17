/** Tile size in world pixels. Everything on the grid (LOS, nav) uses this. */
export const TILE_SIZE = 32;

/** Per-tile gameplay flags stored in `LevelData.flags` (bitmask). */
export const TileFlag = {
  NONE: 0,
  /** Blocks movement (walls, fences, water, trees). */
  SOLID: 1 << 0,
  /** Blocks line of sight (walls, trees, bushes). */
  OCCLUDE: 1 << 1,
  /** Hides the player while standing on it (bushes, lockers). */
  HIDE: 1 << 2,
} as const;
export type TileFlags = number;

/** Semantic tile kinds. The numeric value is also the tile index in the placeholder tileset strip. */
export const TileKind = {
  GRASS: 0,
  PATH: 1,
  FLOOR: 2,
  WALL: 3,
  FENCE: 4,
  BUSH: 5,
  WATER: 6,
  TREE: 7,
  LOCKER: 8,
} as const;
export type TileKindId = (typeof TileKind)[keyof typeof TileKind];

export interface TileDef {
  kind: TileKindId;
  label: string;
  flags: TileFlags;
  /** Which layer the tile is drawn on. */
  layer: 'ground' | 'walls' | 'cover';
  /** Placeholder color (RGB hex). */
  color: number;
}

export const TILE_DEFS: Record<TileKindId, TileDef> = {
  [TileKind.GRASS]: { kind: TileKind.GRASS, label: 'grass', flags: TileFlag.NONE, layer: 'ground', color: 0x4a8f4f },
  [TileKind.PATH]: { kind: TileKind.PATH, label: 'path', flags: TileFlag.NONE, layer: 'ground', color: 0xb9a886 },
  [TileKind.FLOOR]: { kind: TileKind.FLOOR, label: 'floor', flags: TileFlag.NONE, layer: 'ground', color: 0xd2c8b6 },
  [TileKind.WALL]: { kind: TileKind.WALL, label: 'wall', flags: TileFlag.SOLID | TileFlag.OCCLUDE, layer: 'walls', color: 0x4b4f5c },
  [TileKind.FENCE]: { kind: TileKind.FENCE, label: 'fence', flags: TileFlag.SOLID, layer: 'walls', color: 0x8b6b3d },
  [TileKind.BUSH]: { kind: TileKind.BUSH, label: 'bush', flags: TileFlag.OCCLUDE | TileFlag.HIDE, layer: 'cover', color: 0x2f6b39 },
  [TileKind.WATER]: { kind: TileKind.WATER, label: 'water', flags: TileFlag.SOLID, layer: 'walls', color: 0x3a6ea5 },
  [TileKind.TREE]: { kind: TileKind.TREE, label: 'tree', flags: TileFlag.SOLID | TileFlag.OCCLUDE, layer: 'walls', color: 0x245c2c },
  [TileKind.LOCKER]: { kind: TileKind.LOCKER, label: 'locker', flags: TileFlag.OCCLUDE | TileFlag.HIDE, layer: 'cover', color: 0x6b7a8f },
};

export const TILE_KIND_COUNT = Object.keys(TILE_DEFS).length;
