import type Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { DEPTH } from '@/config/constants';
import type { InputIntent } from '@/core/input/intent';
import type { PoopSpotDef, Rect } from '@/core/level/schema';
import { createPoopState, stepPoop, type PoopEvent, type PoopState } from '@/core/rules/poopAction';
import type { Enemy } from '@/game/entities/Enemy';
import type { Player } from '@/game/entities/Player';
import { Poop } from '@/game/entities/Poop';
import { PoopSpot } from '@/game/entities/PoopSpot';
import type { NoiseSystem } from './NoiseSystem';

const rectContains = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const ALERT_RANK = { patrol: 0, return: 0, suspicious: 1, search: 1, chase: 2 } as const;

/**
 * Bridges the pure poop rules to the scene: input, spot lookup, freezing the player, ring, noise, spawning.
 * Owns the spot visuals too. Every spot is single-use: once pooped in it stops counting as a spot at all.
 */
export class PoopSystem {
  state: PoopState = createPoopState();
  readonly poops: Poop[] = [];
  readonly spots: readonly PoopSpot[];
  private readonly ring: Phaser.GameObjects.Graphics;
  onCompleted: ((poop: Poop, spot: PoopSpotDef) => void) | null = null;
  /** Player pressed GO while standing only on an already-used spot (feedback hook). */
  onUsedSpotPressed: ((spot: PoopSpotDef) => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    spots: readonly PoopSpotDef[],
    private readonly noise: NoiseSystem,
  ) {
    this.spots = spots.map((def) => new PoopSpot(scene, def));
    this.ring = scene.add.graphics().setDepth(DEPTH.FX);
  }

  /** The unused spot under (x, y), if any — used spots can't be pooped in again. */
  spotAt(x: number, y: number): PoopSpotDef | null {
    return this.spots.find((s) => !s.used && rectContains(s.def.rect, x, y))?.def ?? null;
  }

  /** The already-used spot under (x, y), if any. */
  usedSpotAt(x: number, y: number): PoopSpotDef | null {
    return this.spots.find((s) => s.used && rectContains(s.def.rect, x, y))?.def ?? null;
  }

  update(dt: number, intent: InputIntent, player: Player, enemies: readonly Enemy[]): PoopEvent[] {
    const spot = this.spotAt(player.x, player.y);
    if (!spot && intent.actionPressed) {
      const used = this.usedSpotAt(player.x, player.y);
      if (used) this.onUsedSpotPressed?.(used);
    }
    const interrupted = enemies.some((e) => ALERT_RANK[e.mode] >= 1 && e.sight.visible);
    const alerted = enemies.some((e) => e.mode === 'chase');
    const { state, events } = stepPoop(
      this.state,
      { held: intent.action, spotMultiplier: spot?.durationMultiplier ?? null, moving: intent.moveMagnitude > 0.05, interrupted, alerted },
      dt,
      BALANCE.poop,
    );
    this.state = state;
    player.frozen = state.active;

    for (const ev of events) {
      if (ev === 'noise') {
        this.noise.emit({ pos: { x: player.x, y: player.y }, radius: BALANCE.poop.noiseRadius, loudness: BALANCE.poop.noiseLoudness, kind: 'poop', sourceId: 'player' });
      } else if (ev === 'completed' && spot) {
        // (stepPoop only completes while standing in a usable spot, so `spot` is set here.)
        this.spots.find((s) => s.def === spot)?.markUsed();
        const poop = new Poop(this.scene, player.x + Math.cos(player.facingRad + Math.PI) * 14, player.y + Math.sin(player.facingRad + Math.PI) * 14);
        this.poops.push(poop);
        this.onCompleted?.(poop, spot);
      }
    }
    this.drawRing(player, spot !== null, interrupted || alerted);
    return events;
  }

  private drawRing(player: Player, inSpot: boolean, blocked: boolean): void {
    const g = this.ring;
    g.clear();
    if (this.state.progress <= 0 && !inSpot) return;
    const r = 24;
    g.lineStyle(4, 0x000000, 0.35);
    g.strokeCircle(player.x, player.y, r);
    if (this.state.progress > 0) {
      g.lineStyle(5, blocked ? 0xff5a5a : this.state.active ? 0x7ee787 : 0xffd166, 1);
      g.beginPath();
      g.arc(player.x, player.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.state.progress, false);
      g.strokePath();
    } else if (inSpot) {
      // "You can go here" hint
      g.lineStyle(2, 0x7ee787, 0.8);
      g.strokeCircle(player.x, player.y, r + 4);
    }
  }

  destroy(): void {
    this.ring.destroy();
    for (const s of this.spots) s.destroy();
    for (const p of this.poops) p.destroy();
    this.poops.length = 0;
  }
}
