import type { Rank } from './score';

export interface LevelBest {
  stars: 1 | 2 | 3;
  rank: Rank;
  score: number;
  timeSeconds: number;
}

export interface Settings {
  sfx: boolean;
  music: boolean;
}

export interface Progress {
  version: 1;
  completed: Record<string, LevelBest>;
  settings: Settings;
}

export const emptyProgress = (): Progress => ({ version: 1, completed: {}, settings: { sfx: true, music: true } });

const RANKS: readonly Rank[] = ['S', 'A', 'B', 'C'];
const isBest = (v: unknown): v is LevelBest =>
  typeof v === 'object' &&
  v !== null &&
  [1, 2, 3].includes((v as LevelBest).stars) &&
  RANKS.includes((v as LevelBest).rank) &&
  typeof (v as LevelBest).score === 'number' &&
  typeof (v as LevelBest).timeSeconds === 'number';

/** Parses a stored progress blob defensively; anything malformed falls back to defaults. */
export function parseProgress(raw: string | null | undefined): Progress {
  const out = emptyProgress();
  if (!raw) return out;
  try {
    const data = JSON.parse(raw) as Partial<Progress> | null;
    if (!data || typeof data !== 'object') return out;
    if (data.completed && typeof data.completed === 'object') {
      for (const [id, best] of Object.entries(data.completed)) if (isBest(best)) out.completed[id] = best;
    }
    if (data.settings && typeof data.settings === 'object') {
      if (typeof data.settings.sfx === 'boolean') out.settings.sfx = data.settings.sfx;
      if (typeof data.settings.music === 'boolean') out.settings.music = data.settings.music;
    }
  } catch {
    /* corrupt JSON → defaults */
  }
  return out;
}

export const serializeProgress = (p: Progress): string => JSON.stringify(p);

/** Records a completed run, keeping the best score per level. Returns a new Progress. */
export function recordResult(p: Progress, levelId: string, result: LevelBest): Progress {
  const prev = p.completed[levelId];
  const keep = prev && prev.score >= result.score ? { ...prev, timeSeconds: Math.min(prev.timeSeconds, result.timeSeconds) } : result;
  return { ...p, completed: { ...p.completed, [levelId]: keep } };
}

/** A level is unlocked when it is the first, or the previous one in `order` is completed. */
export function isUnlocked(p: Progress, order: readonly { id: string }[], levelId: string): boolean {
  const i = order.findIndex((l) => l.id === levelId);
  if (i < 0) return false;
  if (i === 0) return true;
  return order[i - 1]!.id in p.completed;
}

export function nextLevelId(order: readonly { id: string }[], levelId: string): string | null {
  const i = order.findIndex((l) => l.id === levelId);
  return i >= 0 && i + 1 < order.length ? order[i + 1]!.id : null;
}

/** First level not yet completed (or the last level if everything is done). */
export function firstIncompleteLevelId(p: Progress, order: readonly { id: string }[]): string {
  const found = order.find((l) => !(l.id in p.completed));
  return (found ?? order[order.length - 1]!).id;
}
