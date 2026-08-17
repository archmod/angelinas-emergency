import Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '@/config/constants';
import type { BrainMode } from '@/core/ai/enemyBrain';
import { TEX } from '@/game/art/AssetKeys';
import type { InputManager } from '@/game/input/InputManager';
import { TouchSource } from '@/game/input/TouchSource';
import type { EventBus } from '@/game/systems/EventBus';
import type { RunState } from '@/game/systems/RunState';
import { THEME, textStyle } from '@/game/ui/theme';

export interface HudSceneData {
  input: InputManager;
  levelName: string;
  bus: EventBus;
  run: RunState;
  /** Objective sentence for the intro card. */
  intro: string;
  /** One-line mechanic tip under the controls (e.g. how gas works). */
  tip?: string;
}

const ALERT_RANK: Record<BrainMode, number> = { patrol: 0, return: 0, suspicious: 1, search: 1, chase: 2 };
const ALERT_LABEL = ['NOBODY KNOWS', 'SUSPICIOUS…', 'SPOTTED!'] as const;
const METER_W = 260;
const METER_H = 18;
const GAS_Y = 58;
const GAS_H = 12;

/** Screen-fixed overlay: touch controls, urgency meter, objective hint, alert state, pause button. */
export class HudScene extends Phaser.Scene {
  private touch: TouchSource | null = null;
  private removeTouch: (() => void) | null = null;
  private alertText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;
  private meter!: Phaser.GameObjects.Graphics;
  /** 1 right after a fart, decays to 0 (flashes the gas meter). */
  private gasFlash = 0;
  private run!: RunState;
  private inputManager!: InputManager;
  private intro: Phaser.GameObjects.Container | null = null;
  private introAge = 0;
  private readonly enemyModes = new Map<string, BrainMode>();

  constructor() {
    super(SCENES.HUD);
  }

  create(data: HudSceneData): void {
    this.run = data.run;
    this.inputManager = data.input;
    const useTouch = this.sys.game.device.input.touch || navigator.maxTouchPoints > 0;
    if (useTouch) {
      this.touch = new TouchSource(this);
      this.removeTouch = data.input.addSource(this.touch);
    }

    // Top-left: urgency meter with a poop icon, gas meter with a puff icon underneath.
    this.add.image(28, 26, TEX.POOP).setScale(0.6);
    this.meter = this.add.graphics();
    this.add.text(50, 40, 'GOTTA GO', textStyle(12, THEME.colors.textDim));
    this.add.image(28, GAS_Y + GAS_H / 2 + 2, TEX.PUFF).setScale(0.55);
    this.add.text(50, GAS_Y + GAS_H + 4, 'GASSY', textStyle(12, THEME.colors.textDim));

    // Top-center: level name + objective hint + poop counter.
    this.add.text(GAME_WIDTH / 2, 10, data.levelName, textStyle(20, THEME.colors.textDim)).setOrigin(0.5, 0);
    this.hintText = this.add.text(GAME_WIDTH / 2, 36, '', textStyle(20, THEME.colors.text)).setOrigin(0.5, 0);
    this.countText = this.add.text(GAME_WIDTH / 2, 62, '', textStyle(18, THEME.colors.warn)).setOrigin(0.5, 0);

    // Top-right: alert state + pause button.
    this.alertText = this.add.text(GAME_WIDTH - 84, 16, ALERT_LABEL[0], textStyle(22, THEME.colors.ok, { fontStyle: 'bold' })).setOrigin(1, 0);
    const pauseBtn = this.add
      .image(GAME_WIDTH - 44, 30, TEX.BUTTON)
      .setDisplaySize(52, 52)
      .setTint(0x9aa4b2)
      .setInteractive(new Phaser.Geom.Circle(64, 64, 80), Phaser.Geom.Circle.Contains);
    this.add.text(GAME_WIDTH - 44, 30, 'II', textStyle(20, THEME.colors.text, { fontStyle: 'bold' })).setOrigin(0.5);
    pauseBtn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => data.bus.emit('ui:pause', {}));

    this.showIntro(data.levelName, data.intro, data.tip ?? '');

    this.enemyModes.clear();
    const offMode = data.bus.on('enemy:mode', ({ id, to }) => {
      this.enemyModes.set(id, to);
      this.refreshAlert();
    });
    this.gasFlash = 0;
    const offFart = data.bus.on('fart', () => {
      this.gasFlash = 1;
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offMode();
      offFart();
      this.removeTouch?.();
      this.touch?.destroy();
      this.touch = null;
    });
  }

  private showIntro(name: string, objective: string, tip: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(cx - 320, cy - 124, 640, 256, 18);
    const title = this.add.text(cx, cy - 86, name, textStyle(40, THEME.colors.accent, { fontStyle: 'bold' })).setOrigin(0.5);
    const obj = this.add.text(cx, cy - 30, objective, textStyle(22, THEME.colors.text, { align: 'center', wordWrap: { width: 590 } })).setOrigin(0.5);
    const controls = this.touch
      ? 'Left thumb: move · GO: hold to let it out · TOOT: fart early · RUN: sprint (noisy!)'
      : 'WASD move · hold Space to let it out · F toot · Shift run (noisy!) · C sneak';
    const hint = this.add.text(cx, cy + 30, controls, textStyle(18, THEME.colors.textDim)).setOrigin(0.5);
    const tipText = this.add.text(cx, cy + 62, tip, textStyle(16, THEME.colors.textDim, { align: 'center', wordWrap: { width: 590 } })).setOrigin(0.5);
    const go = this.add.text(cx, cy + 102, 'Move to sneak off', textStyle(16, THEME.colors.warn)).setOrigin(0.5);
    this.intro = this.add.container(0, 0, [bg, title, obj, hint, tipText, go]);
    this.introAge = 0;
  }

  private dismissIntro(): void {
    if (!this.intro) return;
    const c = this.intro;
    this.intro = null;
    this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
  }

  private refreshAlert(): void {
    let rank = 0;
    for (const m of this.enemyModes.values()) rank = Math.max(rank, ALERT_RANK[m]);
    const colors = [THEME.colors.ok, THEME.colors.warn, THEME.colors.danger];
    this.alertText.setText(ALERT_LABEL[rank]!).setColor(colors[rank]!);
  }

  override update(time: number, deltaMs: number): void {
    if (this.intro) {
      this.introAge += deltaMs / 1000;
      if (this.introAge > 4 || this.inputManager.intent.moveMagnitude > 0.1 || this.inputManager.intent.actionPressed) this.dismissIntro();
    }
    const u = this.run.urgency;
    const g = this.meter;
    g.clear();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(50, 16, METER_W, METER_H, 6);
    // green → yellow → red
    const c = u < 0.5 ? Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(126, 231, 135), new Phaser.Display.Color(255, 209, 102), 1, u * 2) : Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(255, 209, 102), new Phaser.Display.Color(255, 90, 90), 1, (u - 0.5) * 2);
    const pulse = u > 0.85 ? 0.75 + 0.25 * Math.sin(time / 90) : 1;
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), pulse);
    g.fillRoundedRect(52, 18, Math.max(0, (METER_W - 4) * u), METER_H - 4, 5);
    this.drawGasMeter(time, deltaMs);

    this.hintText.setText(this.run.objectives.hint);
    const { requiredDone, requiredTotal, exitOpen } = this.run.objectives;
    this.countText.setText(`Spots ${requiredDone}/${requiredTotal}${exitOpen ? '  ·  EXIT OPEN' : ''}`);
  }

  /** Gas meter: sickly green fill, a tick where a deliberate toot becomes possible, pulsing yellow when it's about to blow. */
  private drawGasMeter(time: number, deltaMs: number): void {
    const g = this.meter;
    const gas = this.run.gas;
    const { minRelease, warnAt } = BALANCE.fart;
    this.gasFlash = Math.max(0, this.gasFlash - deltaMs / 350);
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(50, GAS_Y, METER_W, GAS_H, 5);
    if (this.gasFlash > 0) {
      g.fillStyle(0xffffff, 0.7 * this.gasFlash);
      g.fillRoundedRect(50, GAS_Y, METER_W, GAS_H, 5);
    }
    const danger = gas >= warnAt;
    const pulse = danger ? 0.7 + 0.3 * Math.sin(time / 70) : 1;
    g.fillStyle(danger ? 0xffd166 : 0xb5e550, pulse);
    g.fillRoundedRect(52, GAS_Y + 2, Math.max(0, (METER_W - 4) * Math.min(1, gas)), GAS_H - 4, 4);
    // "toot from here" tick
    const tickX = 52 + (METER_W - 4) * minRelease;
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(tickX - 1, GAS_Y - 2, 2, GAS_H + 4);
  }
}
