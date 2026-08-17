import Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { DEPTH, REGISTRY, SCENES } from '@/config/constants';
import { TILE_SIZE } from '@/config/tiles';
import type { Rect } from '@/core/level/schema';
import { SPOT_TEXTURE_SIZE, TEX } from '@/game/art/AssetKeys';
import type { AudioSystem } from '@/game/audio/AudioSystem';
import { DebugOverlay } from '@/game/debug/DebugOverlay';
import type { DebugFlags } from '@/game/debug/flags';
import { Enemy, type PlayerSnapshot } from '@/game/entities/Enemy';
import { Player } from '@/game/entities/Player';
import type { Poop } from '@/game/entities/Poop';
import { InputManager } from '@/game/input/InputManager';
import { KeyboardSource } from '@/game/input/KeyboardSource';
import { setupCamera } from '@/game/systems/CameraRig';
import { DetectionSystem } from '@/game/systems/DetectionSystem';
import { EventBus } from '@/game/systems/EventBus';
import { buildLevel, type BuiltLevel } from '@/game/systems/LevelLoader';
import { NavSystem } from '@/game/systems/NavSystem';
import { NoiseSystem } from '@/game/systems/NoiseSystem';
import { PoopSystem } from '@/game/systems/PoopSystem';
import { RunState } from '@/game/systems/RunState';
import { VisionConeRenderer } from '@/game/systems/VisionConeRenderer';
import { DEFAULT_LEVEL_ID, getLevel, type LevelEntry } from '@/levels/registry';
import type { ResultSceneData } from './ResultScene';

export interface GameSceneData {
  levelId?: string;
}

/** The level scene: builds the map, owns the player, enemies, systems and the per-frame update order. */
export class GameScene extends Phaser.Scene {
  level!: BuiltLevel;
  player!: Player;
  enemies: Enemy[] = [];
  bus!: EventBus;
  run!: RunState;
  poop!: PoopSystem;
  private entry!: LevelEntry;
  private inputManager!: InputManager;
  private nav!: NavSystem;
  private noise!: NoiseSystem;
  private detection!: DetectionSystem;
  private cones!: VisionConeRenderer;
  private debug!: DebugOverlay;
  private flags!: DebugFlags;
  private exitSprite: Phaser.GameObjects.TileSprite | null = null;
  private audio!: AudioSystem;
  private exitWasOpen = false;
  private ended = false;

  constructor() {
    super(SCENES.GAME);
  }

  create(data: GameSceneData): void {
    this.ended = false;
    this.exitWasOpen = false;
    this.flags = this.registry.get(REGISTRY.DEBUG_FLAGS) as DebugFlags;
    this.audio = this.registry.get(REGISTRY.AUDIO) as AudioSystem;
    const levelId = data.levelId ?? this.flags.level ?? DEFAULT_LEVEL_ID;
    this.entry = getLevel(levelId);
    const levelData = this.entry.load({ json: (key) => this.cache.json.get(key) as unknown });

    this.bus = new EventBus();
    this.level = buildLevel(this, levelData);
    this.nav = new NavSystem(this.level.grid);
    this.noise = new NoiseSystem(this.bus);
    this.run = new RunState(levelData);
    this.drawZones();

    const spawn = levelData.playerSpawn;
    this.player = new Player(this, spawn.x, spawn.y, this.level.grid);
    this.player.onNoise = (e) => this.noise.emit(e);
    this.physics.add.collider(this.player, this.level.walls);

    this.enemies = levelData.enemies.map((s) => new Enemy(this, s, this.nav, this.bus, this.noise));
    this.physics.add.collider(this.enemies, this.level.walls);
    this.physics.add.collider(this.enemies, this.enemies);

    this.poop = new PoopSystem(this, levelData.poopSpots, this.noise);
    this.poop.onCompleted = (p) => this.onPoopCompleted(p);

    this.detection = new DetectionSystem(this.level.grid, () => this.enemies);
    this.cones = new VisionConeRenderer(this, this.level.grid, () => this.enemies);
    this.debug = new DebugOverlay(this, this.flags, this.level.grid, () => this.enemies, this.noise);

    this.inputManager = new InputManager();
    this.inputManager.addSource(new KeyboardSource(this));
    const req = levelData.rules.requiredPoops;
    const intro = `Poop ${req === 1 ? 'once' : `${req} times`} without getting caught${levelData.rules.exitRequired ? ', then reach the exit' : ''}.`;
    this.scene.launch(SCENES.HUD, { input: this.inputManager, levelName: this.entry.name, bus: this.bus, run: this.run, intro });

    setupCamera(this, this.player, this.level.worldWidth, this.level.worldHeight);

    this.bus.on('player:caught', () => this.lose('caught'));
    this.bus.on('ui:pause', () => this.pause());
    this.bus.on('enemy:mode', ({ from, to }) => {
      if (to === 'suspicious' && (from === 'patrol' || from === 'return')) {
        this.run.timesSuspicious += 1;
        this.audio.play('suspicious', 0.3);
      }
      if (to === 'chase') {
        this.run.timesAlerted += 1;
        this.audio.play('alert', 0.5);
        this.cameras.main.shake(120, 0.004);
      }
    });
    this.bus.on('noise', (n) => {
      if (n.kind === 'footstep' && n.loudness > 0.5) this.audio.play('step', 0.25);
      else if (n.kind === 'poop') this.audio.play('poopNoise', 0.3);
    });
    this.input.keyboard?.on('keydown-R', () => this.scene.restart());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop(SCENES.HUD);
      this.inputManager.destroy();
      this.poop.destroy();
      this.bus.destroy();
      this.enemies = [];
    });
  }

  private drawZones(): void {
    const { poopSpots, exit } = this.level.data;
    // Marker textures are 2× (SPOT_TEXTURE_SIZE); tile them so exactly one marker fills each grid tile of the zone.
    const tileScale = TILE_SIZE / SPOT_TEXTURE_SIZE;
    const rect = (r: Rect, key: string) =>
      this.add.tileSprite(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, key).setTileScale(tileScale, tileScale).setDepth(DEPTH.SPOTS);
    for (const s of poopSpots) rect(s.rect, s.cover === 'hidden' ? TEX.SPOT_HIDDEN : TEX.SPOT_EXPOSED);
    if (exit) this.exitSprite = rect(exit, TEX.EXIT).setAlpha(0.35);
  }

  private onPoopCompleted(poop: Poop): void {
    this.run.onPoopCompleted();
    this.bus.emit('poop:completed', { total: this.run.poopsCompleted });
    this.cameras.main.flash(200, 126, 231, 135, false);
    this.audio.play('poopDone');
    this.floatText(this.player.x, this.player.y - 36, 'Ahh… relief!', '#7ee787');
    this.physics.add.overlap(this.enemies, poop, (obj) => {
      const enemy = obj as Enemy;
      if (!enemy.stunned) {
        enemy.slip(BALANCE.enemy.slipSeconds);
        this.audio.play('slip');
        this.floatText(enemy.x, enemy.y - 30, 'Eww!', '#c99a5b');
        this.noise.emit({ pos: enemy.pos, radius: 60, loudness: 0.4, kind: 'bump', sourceId: enemy.id });
      }
    });
  }

  /** Small rising, fading text in world space. */
  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color, fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(DEPTH.FX);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private pause(): void {
    if (this.ended || this.scene.isPaused()) return;
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause(SCENES.HUD);
    this.scene.pause();
  }

  private lose(reason: 'caught' | 'accident'): void {
    if (this.ended || (reason === 'caught' && this.flags.god)) return;
    this.ended = true;
    this.player.frozen = true;
    this.bus.emit('level:lost', { reason });
    if (reason === 'caught') {
      this.audio.play('caught');
      this.cameras.main.shake(250, 0.01);
      this.cameras.main.flash(300, 255, 60, 60);
    } else {
      this.audio.play('accident');
      this.cameras.main.flash(500, 122, 74, 29);
      this.floatText(this.player.x, this.player.y - 36, 'Oh no…', '#c99a5b');
    }
    this.finish({ outcome: 'lose', reason });
  }

  private win(): void {
    if (this.ended) return;
    this.ended = true;
    this.player.frozen = true;
    this.bus.emit('level:won', {});
    this.audio.play('win');
    this.cameras.main.flash(400, 126, 231, 135);
    this.finish({ outcome: 'win' });
  }

  private finish(result: Pick<ResultSceneData, 'outcome' | 'reason'>): void {
    const data: ResultSceneData = { ...result, levelId: this.entry.id, levelName: this.entry.name, stats: this.run.stats() };
    this.time.delayedCall(1000, () => {
      this.scene.stop(SCENES.HUD);
      this.scene.start(SCENES.RESULT, data);
    });
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const intent = this.inputManager.update();
    if (intent.pausePressed) {
      this.pause();
      return;
    }
    if (!this.ended) this.poop.update(dt, intent, this.player, this.enemies);
    this.player.update(intent, dt);

    const snapshot: PlayerSnapshot = {
      pos: { x: this.player.x, y: this.player.y },
      hidden: this.player.hidden || this.flags.god,
      stanceMul: this.player.stanceMul,
    };
    const noises = this.noise.drain();
    this.detection.update(dt, snapshot, noises);
    this.noise.update(dt);
    if (!this.ended) for (const e of this.enemies) e.tick(dt, snapshot);
    this.cones.update(dt);
    this.debug.update();

    if (!this.ended) {
      this.run.poopProgress = this.poop.state.progress;
      const outcome = this.run.tick(dt, this.player.stance === 'run' && this.player.speed > 1, this.player.x, this.player.y);
      if (this.exitSprite) this.exitSprite.setAlpha(this.run.objectives.exitOpen ? 1 : 0.35);
      if (this.run.objectives.exitOpen && !this.exitWasOpen) {
        this.exitWasOpen = true;
        this.audio.play('exitOpen');
      }
      if (outcome === 'won') this.win();
      else if (outcome === 'accident') this.lose('accident');
    }
  }
}
