import Phaser from 'phaser';
import { GAME_WIDTH, SCENES } from '@/config/constants';
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
}

const ALERT_RANK: Record<BrainMode, number> = { patrol: 0, return: 0, suspicious: 1, search: 1, chase: 2 };
const ALERT_LABEL = ['UNSEEN', 'SUSPICIOUS', 'SPOTTED!'] as const;
const METER_W = 260;
const METER_H = 18;

/** Screen-fixed overlay: touch controls, urgency meter, objective hint, alert state, pause button. */
export class HudScene extends Phaser.Scene {
  private touch: TouchSource | null = null;
  private removeTouch: (() => void) | null = null;
  private alertText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;
  private meter!: Phaser.GameObjects.Graphics;
  private run!: RunState;
  private readonly enemyModes = new Map<string, BrainMode>();

  constructor() {
    super(SCENES.HUD);
  }

  create(data: HudSceneData): void {
    this.run = data.run;
    const useTouch = this.sys.game.device.input.touch || navigator.maxTouchPoints > 0;
    if (useTouch) {
      this.touch = new TouchSource(this);
      this.removeTouch = data.input.addSource(this.touch);
    }

    // Top-left: urgency meter with a poop icon.
    this.add.image(28, 26, TEX.POOP).setScale(0.9);
    this.meter = this.add.graphics();
    this.add.text(50, 40, 'URGENCY', textStyle(12, THEME.colors.textDim));

    // Top-center: level name + objective hint + poop counter.
    this.add.text(GAME_WIDTH / 2, 10, data.levelName, textStyle(20, THEME.colors.textDim)).setOrigin(0.5, 0);
    this.hintText = this.add.text(GAME_WIDTH / 2, 36, '', textStyle(20, THEME.colors.text)).setOrigin(0.5, 0);
    this.countText = this.add.text(GAME_WIDTH / 2, 62, '', textStyle(18, THEME.colors.warn)).setOrigin(0.5, 0);

    // Top-right: alert state + pause button.
    this.alertText = this.add.text(GAME_WIDTH - 84, 16, 'UNSEEN', textStyle(22, THEME.colors.ok, { fontStyle: 'bold' })).setOrigin(1, 0);
    const pauseBtn = this.add
      .image(GAME_WIDTH - 44, 30, TEX.BUTTON)
      .setDisplaySize(52, 52)
      .setTint(0x9aa4b2)
      .setInteractive(new Phaser.Geom.Circle(64, 64, 80), Phaser.Geom.Circle.Contains);
    this.add.text(GAME_WIDTH - 44, 30, 'II', textStyle(20, THEME.colors.text, { fontStyle: 'bold' })).setOrigin(0.5);
    pauseBtn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => data.bus.emit('ui:pause', {}));

    this.enemyModes.clear();
    const offMode = data.bus.on('enemy:mode', ({ id, to }) => {
      this.enemyModes.set(id, to);
      this.refreshAlert();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offMode();
      this.removeTouch?.();
      this.touch?.destroy();
      this.touch = null;
    });
  }

  private refreshAlert(): void {
    let rank = 0;
    for (const m of this.enemyModes.values()) rank = Math.max(rank, ALERT_RANK[m]);
    const colors = [THEME.colors.ok, THEME.colors.warn, THEME.colors.danger];
    this.alertText.setText(ALERT_LABEL[rank]!).setColor(colors[rank]!);
  }

  override update(time: number): void {
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

    this.hintText.setText(this.run.objectives.hint);
    const req = this.run.level.rules.requiredPoops;
    this.countText.setText(`Poops ${this.run.poopsCompleted}/${req}${this.run.objectives.exitOpen ? '  ·  EXIT OPEN' : ''}`);
  }
}
