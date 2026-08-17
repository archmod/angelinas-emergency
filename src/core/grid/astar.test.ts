import { describe, expect, it } from 'vitest';
import { center, gridFromAscii } from '../../../test/helpers/asciiGrid';
import { blocksMovement, hasLineOfSight } from './raycast';
import { findPathTiles, findPathWorld, smoothPath } from './astar';

describe('findPathTiles', () => {
  it('finds a straight path on open ground', () => {
    const g = gridFromAscii(['.....']);
    const p = findPathTiles(g, { x: 0, y: 0 }, { x: 4, y: 0 })!;
    expect(p.map((t) => t.x)).toEqual([0, 1, 2, 3, 4]);
  });

  it('routes around walls', () => {
    const g = gridFromAscii(['.....', '.###.', '.....']);
    const p = findPathTiles(g, { x: 0, y: 1 }, { x: 4, y: 1 })!;
    expect(p[0]).toEqual({ x: 0, y: 1 });
    expect(p[p.length - 1]).toEqual({ x: 4, y: 1 });
    for (const t of p) expect(g.isWalkable(t.x, t.y)).toBe(true);
    // must go over or under the wall; no corner cutting means no diagonals hugging the wall ends: 7 nodes
    expect(p.length).toBe(7);
  });

  it('never cuts corners diagonally', () => {
    const g = gridFromAscii(['..', '#.', '..']);
    // From (0,0) to (0,2): direct diagonal (0,0)->(1,1)->(0,2) is fine (both orthogonals walkable?),
    // but (0,0)->(1,1) needs (1,0) and (0,1): (0,1) is solid → not allowed. Path must go via (1,0),(1,1),(0,2)? that also cuts (0,1)... via (1,0),(1,1),(1,2),(0,2)
    const p = findPathTiles(g, { x: 0, y: 0 }, { x: 0, y: 2 })!;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1]!;
      const b = p[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx !== 0 && dy !== 0) {
        expect(g.isWalkable(a.x + dx, a.y)).toBe(true);
        expect(g.isWalkable(a.x, a.y + dy)).toBe(true);
      }
    }
    expect(p[p.length - 1]).toEqual({ x: 0, y: 2 });
  });

  it('returns null when unreachable or goal is solid', () => {
    const g = gridFromAscii(['.#.', '.#.', '.#.']);
    expect(findPathTiles(g, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
    expect(findPathTiles(g, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it('handles start == goal', () => {
    const g = gridFromAscii(['..']);
    expect(findPathTiles(g, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 1, y: 0 }]);
  });
});

describe('smoothPath / findPathWorld', () => {
  it('collapses collinear open segments and keeps corners around walls', () => {
    const g = gridFromAscii(['......', '.####.', '......']);
    const path = findPathWorld(g, center(0, 0), center(5, 0));
    expect(path[0]).toEqual(center(0, 0));
    expect(path[path.length - 1]).toEqual(center(5, 0));
    expect(path.length).toBe(2); // straight line along the top row
    const around = findPathWorld(g, center(0, 2), center(5, 0));
    expect(around.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < around.length; i++) expect(hasLineOfSight(g, around[i - 1]!, around[i]!, blocksMovement)).toBe(true);
  });

  it('smoothPath keeps endpoints and only removes redundant points', () => {
    const g = gridFromAscii(['....']);
    const pts = [center(0, 0), center(1, 0), center(2, 0), center(3, 0)];
    expect(smoothPath(g, pts)).toEqual([center(0, 0), center(3, 0)]);
    expect(smoothPath(g, pts.slice(0, 2))).toEqual(pts.slice(0, 2));
  });

  it('returns [] when there is no route', () => {
    const g = gridFromAscii(['.#.']);
    expect(findPathWorld(g, center(0, 0), center(2, 0))).toEqual([]);
  });
});
