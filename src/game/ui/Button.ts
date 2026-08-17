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
}

/** Rounded rectangle button with label; works with mouse and touch. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly btnW: number;
  private readonly btnH: number;
  private readonly color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    this.btnW = opts.width ?? 260;
    this.btnH = opts.height ?? 64;
    this.color = opts.color ?? THEME.colors.accentHex;
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, text, textStyle(opts.fontSize ?? 26, opts.textColor ?? '#1b1b24', { fontStyle: 'bold' })).setOrigin(0.5);
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
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.draw(0.85));
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

  private draw(brightness: number): void {
    const c = Phaser.Display.Color.IntegerToColor(this.color);
    const col = Phaser.Display.Color.GetColor(Math.min(255, c.red * brightness), Math.min(255, c.green * brightness), Math.min(255, c.blue * brightness));
    this.bg.clear();
    this.bg.fillStyle(col, 1);
    this.bg.fillRoundedRect(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, 14);
  }
}
