import { parseAsciiLevel } from '@/core/level/asciiLevel';
import type { LevelData, WorldId } from '@/core/level/schema';
import { TEST_01 } from './ascii/test01';

export interface LevelEntry {
  id: string;
  world: WorldId;
  name: string;
  /** Parses/loads the level on demand (cheap for ASCII; async fetch for Tiled later). */
  load: () => LevelData;
}

export const LEVELS: readonly LevelEntry[] = [
  { id: TEST_01.meta.id, world: TEST_01.meta.world, name: TEST_01.meta.name, load: () => parseAsciiLevel(TEST_01) },
];

export const DEFAULT_LEVEL_ID = LEVELS[0]!.id;

export function getLevel(id: string): LevelEntry {
  const entry = LEVELS.find((l) => l.id === id);
  if (!entry) throw new Error(`Unknown level '${id}'`);
  return entry;
}
