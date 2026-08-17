/** Minimal 2D vector helpers on plain objects. Pure functions, no engine dependency. */
export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const distSq = (a: Vec2, b: Vec2): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const norm = (a: Vec2): Vec2 => {
  const l = len(a);
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};
/** Angle in radians from a to b (0 = +x, counter-clockwise positive in math terms; screen y is down). */
export const angleTo = (a: Vec2, b: Vec2): number => Math.atan2(b.y - a.y, b.x - a.x);
export const fromAngle = (rad: number, length = 1): Vec2 => ({ x: Math.cos(rad) * length, y: Math.sin(rad) * length });

const TAU = Math.PI * 2;
/** Wraps an angle to (-PI, PI]. */
export const wrapAngle = (rad: number): number => {
  let a = ((rad + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (a <= -Math.PI) a += TAU;
  return a;
};
/** Signed shortest difference b - a in (-PI, PI]. */
export const angleDiff = (a: number, b: number): number => wrapAngle(b - a);
/** Rotates `current` toward `target` by at most `maxStep` radians. */
export const rotateTowards = (current: number, target: number, maxStep: number): number => {
  const d = angleDiff(current, target);
  if (Math.abs(d) <= maxStep) return wrapAngle(target);
  return wrapAngle(current + Math.sign(d) * maxStep);
};
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;
