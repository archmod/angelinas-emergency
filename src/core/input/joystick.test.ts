import { describe, expect, it } from 'vitest';
import { joystickVector } from './joystick';

const R = 64;
const DZ = 0.15;
const mag = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

describe('joystickVector', () => {
  it('is zero at rest and inside the deadzone', () => {
    expect(joystickVector(0, 0, R, DZ)).toEqual({ x: 0, y: 0, thumbDx: 0, thumbDy: 0 });
    const v = joystickVector(R * 0.1, 0, R, DZ);
    expect(mag(v)).toBe(0);
    expect(v.thumbDx).toBeCloseTo(R * 0.1); // thumb still tracks the finger
  });

  it('ramps from the deadzone edge to full at the ring', () => {
    expect(mag(joystickVector(R * DZ, 0, R, DZ))).toBeCloseTo(0);
    const half = joystickVector(0, R * (DZ + (1 - DZ) / 2), R, DZ);
    expect(mag(half)).toBeCloseTo(0.5);
    expect(half.y).toBeGreaterThan(0);
    expect(mag(joystickVector(R, 0, R, DZ))).toBeCloseTo(1);
  });

  it('stays at max speed when the finger is dragged outside the ring', () => {
    for (const k of [1.01, 1.5, 3, 10]) {
      const v = joystickVector(-R * k, R * k, R, DZ);
      expect(mag(v)).toBeCloseTo(1);
      // Direction preserved (up-left diagonal), thumb pinned to the ring.
      expect(v.x).toBeCloseTo(-Math.SQRT1_2);
      expect(v.y).toBeCloseTo(Math.SQRT1_2);
      expect(Math.hypot(v.thumbDx, v.thumbDy)).toBeCloseTo(R);
    }
  });

  it('keeps direction for arbitrary angles beyond the ring', () => {
    const v = joystickVector(300, -40, R, DZ);
    const len = Math.hypot(300, -40);
    expect(v.x).toBeCloseTo(300 / len);
    expect(v.y).toBeCloseTo(-40 / len);
  });
});
