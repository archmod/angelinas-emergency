import { parseAsciiLevel, type AsciiLevelDef } from '@/core/level/asciiLevel';
import { parseTiledMap, type TiledMap } from '@/core/level/parseTiled';
import type { LevelData, LevelMeta, WorldId } from '@/core/level/schema';
import { NEIGHBORHOOD_01 } from './ascii/neighborhood01';
import { NEIGHBORHOOD_02 } from './ascii/neighborhood02';
import { PARK_01 } from './ascii/park01';
import { PARK_02 } from './ascii/park02';
import { SCHOOL_01 } from './ascii/school01';
import { SCHOOL_02 } from './ascii/school02';
import { TEST_01 } from './ascii/test01';

/** What a level loader may ask the engine for (Tiled maps are fetched by PreloadScene into the JSON cache). */
export interface LoadContext {
  json: (key: string) => unknown;
}

export interface LevelEntry {
  id: string;
  world: WorldId;
  name: string;
  /** Parses/loads the level on demand (ASCII: pure; Tiled: from the JSON cache). */
  load: (ctx?: LoadContext) => LevelData;
  /** For Tiled levels: URL of the .tmj to preload under cache key = level id. */
  tiledUrl?: string;
  /** Hidden from the level select (dev playgrounds), still startable via ?level=. */
  hidden?: boolean;
}

const ascii = (def: AsciiLevelDef, extra: Partial<LevelEntry> = {}): LevelEntry => ({
  id: def.meta.id,
  world: def.meta.world,
  name: def.meta.name,
  load: () => parseAsciiLevel(def),
  ...extra,
});

/** A Tiled map exported as JSON (.tmj) into public/assets/levels/. Preloaded by PreloadScene. */
export const tiled = (meta: LevelMeta, url: string, extra: Partial<LevelEntry> = {}): LevelEntry => ({
  id: meta.id,
  world: meta.world,
  name: meta.name,
  tiledUrl: url,
  load: (ctx) => {
    const json = ctx?.json(meta.id);
    if (!json) throw new Error(`Tiled level '${meta.id}' was not preloaded (${url})`);
    return parseTiledMap(json as TiledMap, meta);
  },
  ...extra,
});

/** Progression order. Level select groups these by world. */
export const LEVELS: readonly LevelEntry[] = [
  ascii(PARK_01),
  ascii(PARK_02),
  ascii(NEIGHBORHOOD_01),
  ascii(NEIGHBORHOOD_02),
  ascii(SCHOOL_01),
  ascii(SCHOOL_02),
  ascii(TEST_01, { hidden: true }),
];

/** Levels shown in the campaign, in unlock order. */
export const CAMPAIGN: readonly LevelEntry[] = LEVELS.filter((l) => !l.hidden);

export const DEFAULT_LEVEL_ID = CAMPAIGN[0]!.id;

export const WORLD_NAMES: Record<WorldId, string> = { park: 'The Park', neighborhood: 'The Neighborhood', school: 'The School' };

export function getLevel(id: string): LevelEntry {
  const entry = LEVELS.find((l) => l.id === id);
  if (!entry) throw new Error(`Unknown level '${id}'`);
  return entry;
}
