import Phaser from 'phaser';
import { DEPTH } from '@/config/constants';
import { getEnemyDef, type EnemyDef } from '@/config/enemies';
import {
  createBrainState,
  stepBrain,
  type BrainCommand,
  type BrainConfig,
  type BrainMode,
  type BrainState,
  type Perception,
} from '@/core/ai/enemyBrain';
import type { SightResult } from '@/core/detection/vision';
import type { EnemySpawn } from '@/core/level/schema';
import { degToRad, dist, rotateTowards, type Vec2 } from '@/core/math/vec';
import { CHARACTER_SCALE, enemyTexture, walkAnim } from '@/game/art/AssetKeys';
import type { EventBus } from '@/game/systems/EventBus';
import type { NavSystem } from '@/game/systems/NavSystem';
import type { NoiseSystem } from '@/game/systems/NoiseSystem';
import { THEME, textStyle } from '@/game/ui/theme';
import { Mover } from './Mover';

export interface PlayerSnapshot {
  pos: Vec2;
  hidden: boolean;
  /** Awareness multiplier for the player's stance. */
  stanceMul: number;
}

const ICON: Record<BrainMode, { text: string; color: string }> = {
  patrol: { text: '', color: THEME.colors.text },
  suspicious: { text: '?', color: THEME.colors.warn },
  chase: { text: '!', color: THEME.colors.danger },
  search: { text: '?', color: THEME.colors.warn },
  return: { text: '', color: THEME.colors.text },
};

/** A patrolling/chasing enemy. Perception comes from DetectionSystem; decisions from the pure brain. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly id: string;
  readonly def: EnemyDef;
  readonly cfg: BrainConfig;
  brain: BrainState;
  /** Latest sight check (updated by DetectionSystem at ~10 Hz). */
  sight: SightResult = { visible: false, factor: 0, distance: Infinity };
  /** Strongest noise heard this frame (set by DetectionSystem, consumed on update). */
  heard: { pos: Vec2; level: number } | null = null;
  facing: number;
  private desiredFacing: number;
  private readonly mover: Mover;
  private readonly icon: Phaser.GameObjects.Text;
  private moveRun = false;
  private stunTimer = 0;

  constructor(
    scene: Phaser.Scene,
    spawn: EnemySpawn,
    private readonly nav: NavSystem,
    private readonly bus: EventBus,
    private readonly noise: NoiseSystem,
  ) {
    super(scene, spawn.pos.x, spawn.pos.y, enemyTexture(getEnemyDef(spawn.kind).kind), 0);
    this.id = spawn.id;
    this.def = getEnemyDef(spawn.kind);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(CHARACTER_SCALE);
    const r = 12 / CHARACTER_SCALE;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.body.setCollideWorldBounds(true);
    this.setDepth(DEPTH.ENEMIES);
    this.facing = degToRad(spawn.facingDeg);
    this.desiredFacing = this.facing;
    this.setRotation(this.facing);
    this.mover = new Mover(this.body);
    this.cfg = {
      def: this.def,
      patrol: spawn.patrol,
      patrolMode: spawn.patrolMode,
      homePos: { ...spawn.pos },
      homeFacingRad: this.facing,
    };
    if (spawn.scanDeg) this.cfg.scanRad = [degToRad(spawn.scanDeg[0]), degToRad(spawn.scanDeg[1])];
    this.brain = createBrainState(this.cfg);
    this.icon = scene.add
      .text(this.x, this.y - 30, '', textStyle(28, THEME.colors.warn, { fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.FX);
  }

  get mode(): BrainMode {
    return this.brain.mode;
  }
  get awareness(): number {
    return this.brain.awareness;
  }
  get lastKnown(): Vec2 | null {
    return this.brain.lastKnown;
  }
  get pathRemaining(): Vec2[] {
    return this.mover.remaining;
  }
  get pos(): Vec2 {
    return { x: this.x, y: this.y };
  }

  /** Stepping in poop: stall for a moment (spinning helplessly). */
  slip(seconds: number): void {
    if (this.stunTimer > 0) return;
    this.stunTimer = seconds;
    this.mover.stop();
    this.icon.setText('@').setColor('#c99a5b');
  }

  get stunned(): boolean {
    return this.stunTimer > 0;
  }

  tick(dt: number, player: PlayerSnapshot): void {
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.animateWalk(0);
      this.setRotation(this.rotation + 14 * dt);
      this.icon.setPosition(this.x, this.y - 26);
      if (this.stunTimer <= 0) {
        this.setRotation(this.facing);
        const icon = ICON[this.brain.mode];
        this.icon.setText(icon.text).setColor(icon.color);
      }
      return;
    }
    const perception: Perception = {
      selfPos: this.pos,
      selfFacingRad: this.facing,
      seesPlayer: this.sight.visible,
      visionFactor: this.sight.factor,
      playerPos: player.pos,
      distToPlayer: dist(this.pos, player.pos),
      playerStanceMul: player.stanceMul,
      heard: this.heard,
      arrived: this.mover.arrived,
      rand: Math.random,
    };
    this.heard = null;
    const { state, commands } = stepBrain(this.brain, perception, dt, this.cfg);
    this.brain = state;
    for (const c of commands) this.apply(c);

    const speed = this.moveRun ? this.def.chaseSpeed : this.def.speed;
    this.mover.update(dt, speed);
    if (!this.mover.arrived) this.desiredFacing = this.mover.heading;
    this.animateWalk(this.mover.arrived ? 0 : speed);
    this.facing = rotateTowards(this.facing, this.desiredFacing, degToRad(this.def.turnRateDeg) * dt);
    this.setRotation(this.facing);

    this.icon.setPosition(this.x, this.y - 26);
  }

  private animateWalk(speed: number): void {
    const key = walkAnim(this.texture.key);
    if (speed > 5 && this.scene.anims.exists(key)) {
      if (!this.anims.isPlaying) this.play(key);
      this.anims.timeScale = Math.max(0.6, Math.min(2, speed / 100));
    } else if (this.anims.isPlaying) {
      this.stop();
      this.setFrame(0);
    }
  }

  private apply(c: BrainCommand): void {
    switch (c.type) {
      case 'moveTo':
        this.moveRun = c.run;
        this.mover.setPath(this.nav.findPath(this.pos, c.target));
        break;
      case 'wander': {
        this.moveRun = c.run;
        const target = this.nav.randomWalkableNear(c.center, c.radius);
        this.mover.setPath(this.nav.findPath(this.pos, target));
        break;
      }
      case 'stop':
        this.mover.stop();
        break;
      case 'face':
        this.desiredFacing = c.angleRad;
        break;
      case 'shout':
        this.noise.emit({ pos: c.pos, radius: 320, loudness: 1, kind: 'shout', sourceId: this.id });
        break;
      case 'caught':
        this.bus.emit('player:caught', { enemyId: this.id });
        break;
      case 'modeChanged': {
        const icon = ICON[c.to];
        this.icon.setText(icon.text).setColor(icon.color);
        if (icon.text) {
          this.icon.setScale(1.6);
          this.scene.tweens.add({ targets: this.icon, scale: 1, duration: 220, ease: 'Back.easeOut' });
        }
        this.bus.emit('enemy:mode', { id: this.id, from: c.from, to: c.to, pos: this.pos });
        if (c.to === 'chase') this.bus.emit('player:spotted', { enemyId: this.id });
        break;
      }
    }
  }

  override destroy(fromScene?: boolean): void {
    this.icon.destroy();
    super.destroy(fromScene);
  }
}
