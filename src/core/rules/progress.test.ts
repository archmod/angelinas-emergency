import { describe, expect, it } from 'vitest';
import { emptyProgress, firstIncompleteLevelId, isUnlocked, nextLevelId, parseProgress, recordResult, serializeProgress, type LevelBest } from './progress';

const order = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const best = (score: number): LevelBest => ({ stars: 3, rank: 'S', score, timeSeconds: 30 });

describe('progress', () => {
  it('round-trips and ignores garbage', () => {
    const p = recordResult(emptyProgress(), 'a', best(900));
    expect(parseProgress(serializeProgress(p))).toEqual(p);
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress('{not json')).toEqual(emptyProgress());
    expect(parseProgress('{"completed":{"a":{"stars":9}},"settings":{"sfx":false}}')).toEqual({ ...emptyProgress(), settings: { sfx: false, music: true } });
  });

  it('keeps the best score and the fastest time', () => {
    let p = recordResult(emptyProgress(), 'a', { stars: 2, rank: 'B', score: 500, timeSeconds: 50 });
    p = recordResult(p, 'a', { stars: 3, rank: 'A', score: 800, timeSeconds: 70 });
    expect(p.completed.a).toEqual({ stars: 3, rank: 'A', score: 800, timeSeconds: 70 });
    p = recordResult(p, 'a', { stars: 1, rank: 'C', score: 100, timeSeconds: 20 });
    expect(p.completed.a).toEqual({ stars: 3, rank: 'A', score: 800, timeSeconds: 20 });
  });

  it('unlocks sequentially and finds next / first incomplete', () => {
    const p0 = emptyProgress();
    expect(isUnlocked(p0, order, 'a')).toBe(true);
    expect(isUnlocked(p0, order, 'b')).toBe(false);
    expect(isUnlocked(p0, order, 'zzz')).toBe(false);
    const p1 = recordResult(p0, 'a', best(1));
    expect(isUnlocked(p1, order, 'b')).toBe(true);
    expect(nextLevelId(order, 'a')).toBe('b');
    expect(nextLevelId(order, 'c')).toBeNull();
    expect(firstIncompleteLevelId(p0, order)).toBe('a');
    expect(firstIncompleteLevelId(p1, order)).toBe('b');
    const all = recordResult(recordResult(p1, 'b', best(1)), 'c', best(1));
    expect(firstIncompleteLevelId(all, order)).toBe('c');
  });
});
