import Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { DEPTH } from '@/config/constants';
import type { InputIntent } from '@/core/input/intent';
import { dist, type Vec2 } from '@/core/math/vec';
import { createGasState, fartNoise, stepGas, ventGas, type GasEvent, type GasState } from '@/core/rules/gas';
import { TEX } from '@/game/art/AssetKeys';
import type { Enemy } from '@/game/entities/Enemy';
import type { Player } from '@/game/entities/Player';
import type { NoiseSystem } from './NoiseSystem';

/** A fart cloud that hangs around for a bit; enemies who walk into it get a whiff. */
interface Cloud {
  pos: Vec2;
  age: number;
  image: Phaser.GameObjects.Image;
  baseAlpha: number;
  /** Enemy ids that already reacted to this cloud. */
  sniffed: Set<string>;
}

/** A fart in progress: emits `remaining` more noise pulses at the player's rear, one every pulseInterval. */
interface Rip {
  radius: number;
  loudness: number;
  strength: number;
  remaining: number;
  timer: number;
}

/**
 * Bridges the pure gas rules to the scene: steps the meter each frame, turns farts into a short burst of noise
 * pulses + puff FX, keeps lingering clouds and lets enemies "smell" them (once per enemy per cloud).
 */
export class FartSystem {
  state: GasState = createGasState();
  private readonly clouds: Cloud[] = [];
  private readonly rips: Rip[] = [];
  /** An enemy just walked into a lingering cloud (for "Pee-yew!" feedback). */
  onSniff: ((enemy: Enemy, cloudPos: Vec2) => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly noise: NoiseSystem,
  ) {}

  /** Advances the gas meter and clouds; returns this frame's gas events for the scene to react to (sound/text). */
  update(dt: number, intent: InputIntent, player: Player, enemies: readonly Enemy[], urgency: number, pooping: boolean): GasEvent[] {
    const { state, events } = stepGas(this.state, { urgency, releasePressed: intent.fartPressed, pooping }, dt, BALANCE.fart);
    this.state = state;

    for (const ev of events) {
      if (ev.type !== 'fart') continue;
      const { radius, loudness, pulses } = fartNoise(ev.strength, ev.forced, BALANCE.fart.noise);
      const strength = ev.forced ? 1 : ev.strength;
      const pos = this.rearOf(player);
      this.rips.push({ radius, loudness, strength, remaining: pulses, timer: 0 });
      this.puffBurst(pos, player.facingRad + Math.PI, strength);
      this.spawnCloud(pos, strength);
    }

    this.updateRips(dt, player);
    this.updateClouds(dt, enemies);
    return events;
  }

  /** The cloud forms just behind her. */
  private rearOf(player: Player): Vec2 {
    const back = player.facingRad + Math.PI;
    return { x: player.x + Math.cos(back) * 12, y: player.y + Math.sin(back) * 12 };
  }

  private updateRips(dt: number, player: Player): void {
    const interval = BALANCE.fart.noise.pulseInterval;
    for (let i = this.rips.length - 1; i >= 0; i--) {
      const rip = this.rips[i]!;
      rip.timer -= dt;
      if (rip.timer > 0) continue;
      rip.timer += interval;
      rip.remaining -= 1;
      const pos = this.rearOf(player);
      this.noise.emit({ pos, radius: rip.radius, loudness: rip.loudness, kind: 'fart', sourceId: 'player' });
      if (rip.remaining > 0) this.puffBurst(pos, player.facingRad + Math.PI, rip.strength * 0.4); // the tail end of the brrrt
      else this.rips.splice(i, 1);
    }
  }

  /** Pooping vents everything. */
  vent(): void {
    this.state = ventGas(this.state);
  }

  private puffBurst(pos: Vec2, backRad: number, strength: number): void {
    const count = 2 + Math.round(strength * 3);
    for (let i = 0; i < count; i++) {
      const spread = Phaser.Math.FloatBetween(-0.7, 0.7);
      const push = Phaser.Math.FloatBetween(10, 26) * (0.6 + strength);
      const puff = this.scene.add
        .image(pos.x, pos.y, TEX.PUFF)
        .setScale(0.2)
        .setAlpha(0.85)
        .setDepth(DEPTH.OVERHEAD);
      this.scene.tweens.add({
        targets: puff,
        x: pos.x + Math.cos(backRad + spread) * push,
        y: pos.y + Math.sin(backRad + spread) * push - Phaser.Math.FloatBetween(6, 16),
        scale: 0.45 + strength * 0.5 + Phaser.Math.FloatBetween(0, 0.2),
        alpha: 0,
        angle: Phaser.Math.FloatBetween(-40, 40),
        duration: 650 + strength * 400 + i * 60,
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  private spawnCloud(pos: Vec2, strength: number): void {
    const cfg = BALANCE.fart.cloud;
    const scale = (cfg.radius * 2) / 64;
    const baseAlpha = 0.3 + 0.2 * strength;
    const image = this.scene.add.image(pos.x, pos.y, TEX.PUFF).setScale(scale * 0.7).setAlpha(baseAlpha).setDepth(DEPTH.SPOTS + 2);
    this.scene.tweens.add({ targets: image, scale: scale * 1.15, duration: cfg.lingerSeconds * 1000, ease: 'Sine.easeOut' });
    this.clouds.push({ pos, age: 0, image, baseAlpha, sniffed: new Set() });
  }

  private updateClouds(dt: number, enemies: readonly Enemy[]): void {
    const cfg = BALANCE.fart.cloud;
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i]!;
      c.age += dt;
      if (c.age >= cfg.lingerSeconds) {
        c.image.destroy();
        this.clouds.splice(i, 1);
        continue;
      }
      // fade out over the second half of the linger time
      const t = c.age / cfg.lingerSeconds;
      c.image.setAlpha(c.baseAlpha * (t < 0.5 ? 1 : 1 - (t - 0.5) * 2));
      for (const e of enemies) {
        if (c.sniffed.has(e.id) || e.def.hearingRadius <= 0) continue; // cameras can't smell
        if (dist(e.pos, c.pos) > cfg.radius + 8) continue;
        c.sniffed.add(e.id);
        e.smell(c.pos, cfg.smellLevel);
        this.onSniff?.(e, c.pos);
      }
    }
  }

  destroy(): void {
    for (const c of this.clouds) c.image.destroy();
    this.clouds.length = 0;
    this.rips.length = 0;
  }
}
