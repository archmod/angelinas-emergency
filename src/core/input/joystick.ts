/**
 * Pure math for a floating virtual joystick: maps the finger's offset from the stick base to a
 * unit-ish move vector plus the clamped thumb offset for rendering.
 *
 * Direction always comes from the raw (unclamped) offset. Past the ring the magnitude is 1 (max
 * speed) no matter how far the finger travels — the previous version divided the clamped offset by
 * the raw distance, so dragging outside the circle slowed the player down instead of pinning it.
 */
export interface JoystickSample {
  /** Move vector; length 0..1 (0 inside the deadzone, 1 at or beyond the ring). */
  x: number;
  y: number;
  /** Thumb offset from the base, clamped to `radius`, for drawing. */
  thumbDx: number;
  thumbDy: number;
}

export function joystickVector(dx: number, dy: number, radius: number, deadzone: number): JoystickSample {
  const len = Math.hypot(dx, dy);
  if (len === 0 || radius <= 0) return { x: 0, y: 0, thumbDx: 0, thumbDy: 0 };
  const nx = dx / len;
  const ny = dy / len;
  const clamped = Math.min(len, radius);
  const m = clamped / radius;
  const dz = Math.min(Math.max(deadzone, 0), 0.999);
  const scaled = m < dz ? 0 : (m - dz) / (1 - dz);
  return { x: nx * scaled, y: ny * scaled, thumbDx: nx * clamped, thumbDy: ny * clamped };
}
