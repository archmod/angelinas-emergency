import type Phaser from 'phaser';
import type { Vec2 } from '@/core/math/vec';

const ARRIVE_DIST = 4;

/** Drives an Arcade body along a list of world points at a given speed. */
export class Mover {
  private path: Vec2[] = [];
  private index = 0;
  /** True when there is nothing left to follow. */
  arrived = true;
  /** Angle of travel (radians) while moving; unchanged when idle. */
  heading = 0;

  constructor(private readonly body: Phaser.Physics.Arcade.Body) {}

  setPath(points: Vec2[]): void {
    this.path = points;
    this.index = 0;
    this.arrived = points.length === 0;
    if (this.arrived) this.body.setVelocity(0, 0);
  }

  stop(): void {
    this.setPath([]);
  }

  get target(): Vec2 | null {
    return this.path[this.index] ?? null;
  }

  get remaining(): Vec2[] {
    return this.path.slice(this.index);
  }

  update(dt: number, speed: number): void {
    if (this.arrived) {
      this.body.setVelocity(0, 0);
      return;
    }
    const pos = this.body.center;
    let target = this.path[this.index]!;
    let dx = target.x - pos.x;
    let dy = target.y - pos.y;
    let d = Math.hypot(dx, dy);
    // Advance past waypoints we're already on (or would overshoot this frame).
    while (d <= Math.max(ARRIVE_DIST, speed * dt) && this.index < this.path.length - 1) {
      this.index += 1;
      target = this.path[this.index]!;
      dx = target.x - pos.x;
      dy = target.y - pos.y;
      d = Math.hypot(dx, dy);
    }
    if (d <= Math.max(ARRIVE_DIST, speed * dt * 0.5)) {
      this.arrived = true;
      this.body.setVelocity(0, 0);
      return;
    }
    this.heading = Math.atan2(dy, dx);
    this.body.setVelocity((dx / d) * speed, (dy / d) * speed);
  }
}
