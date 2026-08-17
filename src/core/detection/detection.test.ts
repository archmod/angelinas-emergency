import { describe, expect, it } from 'vitest';
import { center, gridFromAscii } from '../../../test/helpers/asciiGrid';
import { hearingLevel } from './noise';
import { canSee, type Observer } from './vision';

const grid = gridFromAscii(['..........', '....#.....', '..........']);
const obs = (over: Partial<Observer> = {}): Observer => ({
  pos: center(0, 0),
  facingRad: 0, // looking +x
  fovRad: Math.PI / 2,
  viewDistance: 300,
  proximityRadius: 40,
  ...over,
});

describe('canSee', () => {
  it('sees a visible target in front within range, factor falls with distance', () => {
    const near = canSee(obs(), { pos: center(2, 0), hidden: false }, grid);
    const far = canSee(obs(), { pos: center(8, 0), hidden: false }, grid);
    expect(near.visible).toBe(true);
    expect(far.visible).toBe(true);
    expect(near.factor).toBeGreaterThan(far.factor);
  });
  it('respects range, FOV and line of sight', () => {
    expect(canSee(obs({ viewDistance: 50 }), { pos: center(8, 0), hidden: false }, grid).visible).toBe(false);
    expect(canSee(obs(), { pos: center(0, 2), hidden: false }, grid).visible).toBe(false); // 90° off, outside 45° half-fov
    expect(canSee(obs({ pos: center(0, 1) }), { pos: center(8, 1), hidden: false }, grid).visible).toBe(false); // wall at (4,1)
  });
  it('hidden targets are invisible unless practically touched', () => {
    expect(canSee(obs(), { pos: center(2, 0), hidden: true }, grid).visible).toBe(false);
    expect(canSee(obs(), { pos: { x: 16 + 30, y: 16 }, hidden: true }, grid).visible).toBe(false); // 30px: inside proximity but > half
    expect(canSee(obs(), { pos: { x: 16 + 15, y: 16 }, hidden: true }, grid).visible).toBe(true); // 15px: bumped into
  });
  it('proximity ignores facing', () => {
    expect(canSee(obs(), { pos: { x: 16 - 30, y: 16 }, hidden: false }, grid).visible).toBe(true); // behind, but 30px away
  });
});

describe('hearingLevel', () => {
  const ev = { pos: { x: 0, y: 0 }, radius: 100, loudness: 1, kind: 'footstep' as const, sourceId: 'player' };
  it('is loudest at the source and fades to zero at radius + hearing', () => {
    expect(hearingLevel({ x: 0, y: 0 }, 100, ev)).toBeCloseTo(1);
    expect(hearingLevel({ x: 100, y: 0 }, 100, ev)).toBeCloseTo(0.5);
    expect(hearingLevel({ x: 200, y: 0 }, 100, ev)).toBe(0);
    expect(hearingLevel({ x: 50, y: 0 }, 100, { ...ev, loudness: 0.5 })).toBeCloseTo(0.375);
  });
  it('deaf listeners with tiny events hear nothing', () => {
    expect(hearingLevel({ x: 1, y: 0 }, 0, { ...ev, radius: 0 })).toBe(0);
  });
});
