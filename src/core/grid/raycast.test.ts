import { describe, expect, it } from 'vitest';
import { center, gridFromAscii } from '../../../test/helpers/asciiGrid';
import { blocksMovement, castRay, castRayAngle, hasLineOfSight } from './raycast';

const grid = gridFromAscii([
  '..........',
  '....#.....',
  '....#.....',
  '..........',
  '..==......',
  '..........',
]);

describe('castRay', () => {
  it('is clear across open ground', () => {
    const r = castRay(grid, center(0, 0), center(9, 0));
    expect(r.hit).toBe(false);
    expect(r.point).toEqual(center(9, 0));
    expect(r.distance).toBeCloseTo(9 * 32);
  });

  it('stops at the first occluding tile with the correct hit point', () => {
    const r = castRay(grid, center(0, 1), center(9, 1));
    expect(r.hit).toBe(true);
    expect(r.tile).toEqual({ x: 4, y: 1 });
    expect(r.point.x).toBeCloseTo(4 * 32); // left edge of the wall tile
    expect(r.point.y).toBeCloseTo(1.5 * 32);
    expect(r.distance).toBeCloseTo(4 * 32 - 16);
  });

  it('handles diagonal rays and vertical rays', () => {
    expect(hasLineOfSight(grid, center(0, 5), center(9, 3))).toBe(true); // shallow diagonal under the wall
    expect(hasLineOfSight(grid, center(0, 0), center(9, 3))).toBe(false); // crosses (4,1)
    expect(hasLineOfSight(grid, center(0, 3), center(9, 0))).toBe(false); // crosses (4,2)
    const v = castRay(grid, center(4, 0), center(4, 5));
    expect(v.hit).toBe(true);
    expect(v.tile).toEqual({ x: 4, y: 1 });
  });

  it('respects the blocking predicate (fences block movement, not sight)', () => {
    expect(hasLineOfSight(grid, center(0, 4), center(9, 4))).toBe(true);
    const r = castRay(grid, center(0, 4), center(9, 4), blocksMovement);
    expect(r.hit).toBe(true);
    expect(r.tile).toEqual({ x: 2, y: 4 });
  });

  it('never blocks on the starting tile and treats out-of-bounds as solid', () => {
    const wallGrid = gridFromAscii(['B..']);
    expect(hasLineOfSight(wallGrid, center(0, 0), center(2, 0))).toBe(true); // observer inside a bush looks out
    const r = castRayAngle(grid, center(0, 0), Math.PI, 500); // toward -x, off the map
    expect(r.hit).toBe(true);
    expect(r.point.x).toBeCloseTo(0);
  });

  it('zero-length ray is a no-op', () => {
    const r = castRay(grid, center(1, 1), center(1, 1));
    expect(r.hit).toBe(false);
    expect(r.distance).toBe(0);
  });
});
