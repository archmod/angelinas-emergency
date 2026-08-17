import Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { DEPTH, REGISTRY, SCENES } from '@/config/constants';
import { TILE_SIZE } from '@/config/tiles';
import type { PoopSpotDef } from '@/core/level/schema';
import type { GasEvent } from '@/core/rules/gas';
import { CHARACTER_SCALE, SPOT_TEXTURE_SIZE, TEX } from '@/game/art/AssetKeys';
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
import { FartSystem } from '@/game/systems/FartSystem';
import { buildLevel, type BuiltLevel } from '@/game/systems/LevelLoader';
import { NavSystem } from '@/game/systems/NavSystem';
import { NoiseSystem } from '@/game/systems/NoiseSystem';
import { PoopSystem } from '@/game/systems/PoopSystem';
import { RunState } from '@/game/systems/RunState';
import { VisionConeRenderer } from '@/game/systems/VisionConeRenderer';
import { THEME } from '@/game/ui/theme';
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
  fart!: FartSystem;
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
  private usedSpotHintUntil = 0;
  private ended = false;
  private lastDryToot = -Infinity;

  constructor() {
    super(SCENES.GAME);
  }

  create(data: GameSceneData): void {
    this.ended = false;
    this.exitWasOpen = false;
    this.usedSpotHintUntil = 0;
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
    this.poop.onCompleted = (p, spot) => this.onPoopCompleted(p, spot);
    this.poop.onUsedSpotPressed = () => this.onUsedSpotPressed();
    this.fart = new FartSystem(this, this.noise);
    this.fart.onSniff = (enemy) => {
      this.audio.play('sniff', 0.3);
      this.floatText(enemy.x, enemy.y - 30, 'Pee-yew!', THEME.colors.warn);
    };

    this.detection = new DetectionSystem(this.level.grid, () => this.enemies);
    this.cones = new VisionConeRenderer(this, this.level.grid, () => this.enemies);
    this.debug = new DebugOverlay(this, this.flags, this.level.grid, () => this.enemies, this.noise);

    this.inputManager = new InputManager();
    this.inputManager.addSource(new KeyboardSource(this));
    const req = this.run.requiredSpotIds.length;
    const where = req === 1 ? 'Poop at the pinned spot' : `Poop at ${req === 2 ? 'both' : `all ${req}`} pinned spots (one go each)`;
    const intro = `${where} without anyone noticing${levelData.rules.exitRequired ? ', then slip away to the exit' : ''}. Joshau must never find out.`;
    const tip = 'Gas builds up — toot early when nobody’s near (quiet), or it rips out on its own (LOUD).';
    this.scene.launch(SCENES.HUD, { input: this.inputManager, levelName: this.entry.name, bus: this.bus, run: this.run, intro, tip });

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
      this.fart.destroy();
      this.bus.destroy();
      this.enemies = [];
    });
  }

  /** Exit zone marker (poop spots draw themselves — see PoopSpot). Dim until the exit opens. */
  private drawZones(): void {
    const exit = this.level.data.exit;
    if (!exit) return;
    // Marker texture is 2× (SPOT_TEXTURE_SIZE); tile it so exactly one marker fills each grid tile of the zone.
    const tileScale = TILE_SIZE / SPOT_TEXTURE_SIZE;
    this.exitSprite = this.add
      .tileSprite(exit.x + exit.w / 2, exit.y + exit.h / 2, exit.w, exit.h, TEX.EXIT)
      .setTileScale(tileScale, tileScale)
      .setDepth(DEPTH.SPOTS)
      .setAlpha(0.35);
  }

  private onPoopCompleted(poop: Poop, spot: PoopSpotDef): void {
    this.run.onPoopCompleted(spot);
    this.fart.vent();
    this.bus.emit('poop:completed', { total: this.run.poopsCompleted, spotId: spot.id, required: spot.required });
    this.cameras.main.flash(200, 126, 231, 135, false);
    this.audio.play('poopDone');
    const { requiredDone, requiredTotal } = this.run.objectives;
    const label = !spot.required ? 'Ahh… bonus relief!' : requiredTotal > 1 && requiredDone < requiredTotal ? `Ahh… ${requiredTotal - requiredDone} to go!` : 'Ahh… relief!';
    this.floatText(this.player.x, this.player.y - 36, label, '#7ee787');
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

  /** GO pressed on a spot she already used: one poop per spot — going twice would give her away. */
  private onUsedSpotPressed(): void {
    if (this.time.now < this.usedSpotHintUntil) return;
    this.usedSpotHintUntil = this.time.now + 1500;
    this.floatText(this.player.x, this.player.y - 36, 'Not here again — too obvious!', THEME.colors.warn);
  }

  /** Sound, text and a wobble for each gas event (see core/rules/gas.ts). */
  private onGasEvent(ev: GasEvent): void {
    const p = this.player;
    if (ev.type === 'gurgle') {
      this.audio.play('gurgle');
      this.floatText(p.x, p.y - 36, '*grrrumble*', THEME.colors.warn);
      this.wobblePlayer(3, 1.1);
    } else if (ev.type === 'fart') {
      const big = ev.forced || ev.strength > 0.6;
      this.audio.play(big ? 'fartBig' : 'fart');
      const label = ev.forced ? 'PFFRRRRT!!' : ev.strength < 0.35 ? 'pfft' : ev.strength < 0.7 ? 'Pffft!' : 'PFFRRT!';
      const color = ev.forced ? THEME.colors.danger : ev.strength < 0.35 ? THEME.colors.ok : THEME.colors.warn;
      this.floatText(p.x, p.y - 36, label, color);
      this.wobblePlayer(ev.forced ? 3 : 1, ev.forced ? 1.25 : 1.12);
      if (ev.forced) this.cameras.main.shake(90, 0.003);
      this.bus.emit('fart', { forced: ev.forced, strength: ev.strength });
    } else if (ev.type === 'dry') {
      if (this.time.now - this.lastDryToot < 1000) return;
      this.lastDryToot = this.time.now;
      this.floatText(p.x, p.y - 36, '…nothing yet', THEME.colors.textDim);
    }
  }

  /** Quick squash-and-stretch on Angelina (repeats = wobble count, amount = peak scale factor). */
  private wobblePlayer(repeats: number, amount: number): void {
    this.tweens.killTweensOf(this.player);
    this.player.setScale(CHARACTER_SCALE);
    this.tweens.add({
      targets: this.player,
      scaleX: CHARACTER_SCALE * amount,
      scaleY: CHARACTER_SCALE * (2 - amount),
      duration: 70,
      yoyo: true,
      repeat: repeats - 1,
      ease: 'Sine.easeInOut',
      onComplete: () => this.player.setScale(CHARACTER_SCALE),
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
    if (!this.ended) {
      this.poop.update(dt, intent, this.player, this.enemies);
      for (const ev of this.fart.update(dt, intent, this.player, this.enemies, this.run.urgency, this.poop.state.active)) this.onGasEvent(ev);
    }
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
      this.run.gas = this.fart.state.gas;
      this.run.farts = this.fart.state.farts;
      this.run.forcedFarts = this.fart.state.forcedFarts;
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
