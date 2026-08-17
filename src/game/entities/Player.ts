import Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { DEPTH } from '@/config/constants';
import type { Grid } from '@/core/grid/Grid';
import type { NoiseEvent } from '@/core/detection/noise';
import type { InputIntent } from '@/core/input/intent';
import { degToRad, rotateTowards } from '@/core/math/vec';
import { TEX } from '@/game/art/AssetKeys';

export type Stance = 'sneak' | 'walk' | 'run';

/** Angelina. Movement is driven purely by an InputIntent; no engine input APIs in here. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  stance: Stance = 'walk';
  /** True while standing on a HIDE tile (bush/locker/hidden spot). */
  hidden = false;
  /** Set by the poop system to freeze movement. */
  frozen = false;
  /** Called for every footstep noise; wired to the NoiseSystem by GameScene. */
  onNoise: ((e: NoiseEvent) => void) | null = null;
  private facing = 0; // radians
  private stepDistance = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly grid: Grid) {
    super(scene, x, y, TEX.PLAYER);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const r = BALANCE.player.bodyRadius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.body.setCollideWorldBounds(true);
    this.setDepth(DEPTH.PLAYER);
  }

  get facingRad(): number {
    return this.facing;
  }
  get speed(): number {
    return this.body.velocity.length();
  }
  /** Awareness multiplier enemies apply when they see her (sneaking is less conspicuous). */
  get stanceMul(): number {
    return this.stance === 'sneak' ? 0.6 : this.stance === 'run' ? 1.5 : 1;
  }

  override update(intent: InputIntent, dt: number): void {
    if (this.frozen) {
      this.body.setVelocity(0, 0);
      return;
    }
    this.stance = intent.sneak ? 'sneak' : intent.run ? 'run' : 'walk';
    const max =
      this.stance === 'sneak' ? BALANCE.player.sneakSpeed : this.stance === 'run' ? BALANCE.player.runSpeed : BALANCE.player.walkSpeed;
    // Analog: joystick magnitude scales speed, so a gentle push is a quiet creep.
    const speed = max * intent.moveMagnitude;
    this.body.setVelocity(intent.moveX * speed, intent.moveY * speed);

    if (intent.moveMagnitude > 0.01) {
      const target = Math.atan2(intent.moveY, intent.moveX);
      this.facing = rotateTowards(this.facing, target, degToRad(BALANCE.player.turnRateDeg) * dt);
      this.setRotation(this.facing);
    }

    const t = this.grid.worldToTile({ x: this.x, y: this.y });
    this.hidden = this.grid.isHiding(t.x, t.y);
    this.setAlpha(this.hidden ? 0.85 : 1);

    // Footsteps: one noise event per stride; louder and farther-carrying when running, silent when sneaking.
    this.stepDistance += speed * dt;
    const stride = this.stance === 'run' ? 34 : 28;
    if (this.stepDistance >= stride) {
      this.stepDistance = 0;
      const noise = BALANCE.noise[this.stance];
      if (noise && this.onNoise) {
        this.onNoise({ pos: { x: this.x, y: this.y }, radius: noise.radius, loudness: noise.loudness, kind: 'footstep', sourceId: 'player' });
      }
    }
  }
}
