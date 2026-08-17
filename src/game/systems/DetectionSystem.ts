import { hearingLevel, type NoiseEvent } from '@/core/detection/noise';
import { canSee } from '@/core/detection/vision';
import type { Grid } from '@/core/grid/Grid';
import { degToRad } from '@/core/math/vec';
import type { Enemy, PlayerSnapshot } from '@/game/entities/Enemy';

const SIGHT_INTERVAL = 0.1; // seconds between sight checks per enemy (staggered)

/** Feeds each enemy its perception: sight checks at ~10 Hz (staggered) and noise every frame. */
export class DetectionSystem {
  private readonly timers = new Map<string, number>();

  constructor(
    private readonly grid: Grid,
    private readonly enemies: () => readonly Enemy[],
  ) {}

  update(dt: number, player: PlayerSnapshot, noises: readonly NoiseEvent[]): void {
    const list = this.enemies();
    list.forEach((enemy, i) => {
      // Stagger: enemy i starts its cycle offset by i * interval / n.
      let t = this.timers.get(enemy.id);
      if (t === undefined) t = (i / Math.max(1, list.length)) * SIGHT_INTERVAL;
      t += dt;
      if (t >= SIGHT_INTERVAL) {
        t -= SIGHT_INTERVAL;
        enemy.sight = canSee(
          {
            pos: enemy.pos,
            facingRad: enemy.facing,
            fovRad: degToRad(enemy.def.fovDeg),
            viewDistance: enemy.def.viewDistance,
            proximityRadius: enemy.def.proximityRadius,
          },
          { pos: player.pos, hidden: player.hidden },
          this.grid,
        );
      }
      this.timers.set(enemy.id, t);

      // Hearing: strongest audible noise this frame (ignoring own shouts).
      let best: { pos: { x: number; y: number }; level: number } | null = null;
      for (const n of noises) {
        if (n.sourceId === enemy.id) continue;
        const level = hearingLevel(enemy.pos, enemy.def.hearingRadius, n);
        if (level > 0 && (!best || level > best.level)) best = { pos: n.pos, level };
      }
      if (best) enemy.heard = best;
    });
  }
}
