import Phaser from 'phaser';
import { DEPTH, REGISTRY } from '@/config/constants';
import type { AudioSystem } from '@/game/audio/AudioSystem';
import { THEME, textStyle } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  textColor?: string;
  fontSize?: number;
  /** Draw three toe bumps along the top edge so the button reads as a frog foot pad. */
  toes?: boolean;
}

const OUTLINE = THEME.colors.poopDark;
const SHADOW = 0x140a04;
const DROP = 6; // resting drop-shadow offset (px); the button "presses down" onto it

/** Chunky cartoon pill button (optionally a three-toed foot pad); works with mouse and touch. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly btnW: number;
  private readonly btnH: number;
  private readonly color: number;
  private readonly toes: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    this.btnW = opts.width ?? 260;
    this.btnH = opts.height ?? 64;
    this.color = opts.color ?? THEME.button.primary;
    this.toes = opts.toes ?? false;
    this.bg = scene.add.graphics();
    const textColor = opts.textColor ?? (isLight(this.color) ? THEME.colors.bgHex : THEME.colors.text);
    this.label = scene.add.text(0, 0, text, textStyle(opts.fontSize ?? 26, textColor, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(this.btnW, this.btnH);
    this.setDepth(DEPTH.UI);
    this.draw(1);
    // Container hit areas are tested in origin-normalized space: Phaser adds displayOriginX/Y (= w/2, h/2 after
    // setSize) to the local pointer position, so the rectangle must start at (0, 0), NOT at (-w/2, -h/2). A centered
    // rectangle would shift the live region up-left by half a button (only the top-left quadrant responds).
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.btnW, this.btnH), Phaser.Geom.Rectangle.Contains);
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.draw(1.08));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.draw(1));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.draw(0.9, true));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.draw(1.08);
      (scene.registry.get(REGISTRY.AUDIO) as AudioSystem | undefined)?.play('click');
      onClick();
    });
    scene.add.existing(this);
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  private draw(brightness: number, pressed = false): void {
    const c = Phaser.Display.Color.IntegerToColor(this.color);
    const col = Phaser.Display.Color.GetColor(Math.min(255, c.red * brightness), Math.min(255, c.green * brightness), Math.min(255, c.blue * brightness));
    const w = this.btnW;
    const h = this.btnH;
    const r = h * 0.45;
    const rest = Math.min(DROP, Math.round(h * 0.1));
    const drop = pressed ? 2 : rest;
    const dy = pressed ? rest - 2 : 0; // pressed: the face sinks onto its shadow
    const toeR = h * 0.19;
    const toes: Array<[number, number]> = this.toes
      ? [
          [-w * 0.27, -h / 2 - h * 0.05],
          [0, -h / 2 - h * 0.11],
          [w * 0.27, -h / 2 - h * 0.05],
        ]
      : [];
    const g = this.bg;
    g.clear();
    // drop shadow (face + toes)
    g.fillStyle(SHADOW, 0.55);
    g.fillRoundedRect(-w / 2, -h / 2 + drop + dy, w, h, r);
    for (const [tx, ty] of toes) g.fillCircle(tx, ty + drop + dy, toeR);
    // toes sit behind the face so its top edge cuts them into bumps
    g.fillStyle(col, 1);
    g.lineStyle(4, OUTLINE, 1);
    for (const [tx, ty] of toes) {
      g.fillCircle(tx, ty + dy, toeR);
      g.strokeCircle(tx, ty + dy, toeR);
    }
    // face
    g.fillStyle(col, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
    g.lineStyle(4, OUTLINE, 1);
    g.strokeRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
    // gloss
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 5 + dy, w - 16, h * 0.36, r * 0.55);
    this.label.setY(dy);
  }
}

/** True for fills that need a dark label (perceived luminance). */
function isLight(color: number): boolean {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return (0.299 * c.red + 0.587 * c.green + 0.114 * c.blue) / 255 > 0.55;
}
