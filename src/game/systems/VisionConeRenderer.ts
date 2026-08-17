import type Phaser from 'phaser';
import { DEPTH } from '@/config/constants';
import type { BrainMode } from '@/core/ai/enemyBrain';
import type { Grid } from '@/core/grid/Grid';
import { castRayAngle } from '@/core/grid/raycast';
import { degToRad } from '@/core/math/vec';
import type { Enemy } from '@/game/entities/Enemy';

const RAYS = 20;
const REDRAW_INTERVAL = 1 / 20;

const CONE_STYLE: Record<BrainMode, { color: number; alpha: number }> = {
  patrol: { color: 0xffd166, alpha: 0.16 },
  return: { color: 0xffd166, alpha: 0.16 },
  suspicious: { color: 0xff8c42, alpha: 0.24 },
  search: { color: 0xff8c42, alpha: 0.24 },
  chase: { color: 0xff5a5a, alpha: 0.3 },
};

/**
 * Draws every enemy's vision cone as a wall-clipped polygon. Uses the same raycast as detection,
 * so what the player sees is exactly what the enemy can see.
 */
export class VisionConeRenderer {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private acc = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly grid: Grid,
    private readonly enemies: () => readonly Enemy[],
  ) {
    this.gfx = scene.add.graphics().setDepth(DEPTH.CONES);
  }

  update(dt: number): void {
    this.acc += dt;
    if (this.acc < REDRAW_INTERVAL) return;
    this.acc = 0;
    const g = this.gfx;
    g.clear();
    for (const e of this.enemies()) {
      if (e.def.viewDistance <= 0 || e.def.fovDeg <= 0) continue;
      const style = CONE_STYLE[e.mode];
      const half = degToRad(e.def.fovDeg) / 2;
      const origin = e.pos;
      const points: { x: number; y: number }[] = [origin];
      for (let i = 0; i <= RAYS; i++) {
        const a = e.facing - half + (i / RAYS) * half * 2;
        points.push(castRayAngle(this.grid, origin, a, e.def.viewDistance).point);
      }
      g.fillStyle(style.color, style.alpha);
      g.lineStyle(1.5, style.color, style.alpha + 0.25);
      g.beginPath();
      g.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i]!.x, points[i]!.y);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
