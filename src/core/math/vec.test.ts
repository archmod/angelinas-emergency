import { describe, expect, it } from 'vitest';
import { angleDiff, angleTo, clamp, dist, norm, rotateTowards, vec, wrapAngle } from './vec';

describe('vec', () => {
  it('measures distance and normalizes', () => {
    expect(dist(vec(0, 0), vec(3, 4))).toBe(5);
    expect(norm(vec(0, 0))).toEqual({ x: 0, y: 0 });
    const n = norm(vec(10, 0));
    expect(n.x).toBeCloseTo(1);
    expect(n.y).toBeCloseTo(0);
  });

  it('wraps angles into (-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(0.5)).toBeCloseTo(0.5);
  });

  it('computes shortest signed angle difference', () => {
    expect(angleDiff(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(angleDiff(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2);
    expect(angleTo(vec(0, 0), vec(0, 1))).toBeCloseTo(Math.PI / 2);
  });

  it('rotates toward a target with a max step', () => {
    expect(rotateTowards(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(rotateTowards(0, 0.1, 0.25)).toBeCloseTo(0.1);
    // crossing the ±PI seam: shortest way from 0.95π to -0.95π is +0.1π (≈0.314)
    expect(rotateTowards(Math.PI * 0.95, -Math.PI * 0.95, 0.4)).toBeCloseTo(-Math.PI * 0.95);
    expect(rotateTowards(Math.PI * 0.95, -Math.PI * 0.95, 0.2)).toBeCloseTo(Math.PI * 0.95 + 0.2 - Math.PI * 2);
  });

  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});
