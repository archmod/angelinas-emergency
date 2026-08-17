import type { Grid } from '@/core/grid/Grid';
import { hasLineOfSight } from '@/core/grid/raycast';
import { angleDiff, angleTo, dist, type Vec2 } from '@/core/math/vec';

export interface Observer {
  pos: Vec2;
  facingRad: number;
  fovRad: number;
  viewDistance: number;
  proximityRadius: number;
}

export interface SightTarget {
  pos: Vec2;
  /** Standing in cover (bush/locker/hidden spot). */
  hidden: boolean;
}

export interface SightResult {
  visible: boolean;
  /** 0..1, higher when closer. 0 when not visible. */
  factor: number;
  distance: number;
}

const NOT_VISIBLE = (distance: number): SightResult => ({ visible: false, factor: 0, distance });

/**
 * Can `observer` see `target`? Order of checks (cheap → expensive): proximity, hidden, range, FOV,
 * line of sight. Proximity beats hiding only at half the radius (they walk into your bush).
 */
export function canSee(observer: Observer, target: SightTarget, grid: Grid): SightResult {
  const d = dist(observer.pos, target.pos);
  if (observer.proximityRadius > 0 && d <= observer.proximityRadius) {
    if (!target.hidden || d <= observer.proximityRadius * 0.5) return { visible: true, factor: 1, distance: d };
  }
  if (target.hidden) return NOT_VISIBLE(d);
  if (d > observer.viewDistance) return NOT_VISIBLE(d);
  const toTarget = angleTo(observer.pos, target.pos);
  if (Math.abs(angleDiff(observer.facingRad, toTarget)) > observer.fovRad / 2) return NOT_VISIBLE(d);
  if (!hasLineOfSight(grid, observer.pos, target.pos)) return NOT_VISIBLE(d);
  const factor = Math.max(0.15, 1 - d / observer.viewDistance);
  return { visible: true, factor, distance: d };
}
