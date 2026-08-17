import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT } from '@/config/constants';
import { MENU_ART, TEX } from '@/game/art/AssetKeys';
import { THEME, textStyle } from './theme';

export interface JoshauOptions {
  /** Screen x of his head. */
  x: number;
  /** Where the speech bubble goes relative to him. */
  bubble?: 'left' | 'above';
}

const BUBBLE_W = 210;
const RISE_MS = 450;
const DUCK_MS = 320;

/**
 * Joshau, Angelina's boyfriend, lurking below the bottom edge of the screen. `peek()` pops him up with a speech line
 * and (unless asked to stay) ducks him back down. He never fully leaves — a tuft of hair always shows.
 */
export class Joshau {
  private readonly scene: Phaser.Scene;
  private readonly img: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private readonly restY: number;
  private readonly peekY: number;
  private busy = false;

  constructor(scene: Phaser.Scene, opts: JoshauOptions) {
    this.scene = scene;
    this.peekY = GAME_HEIGHT - MENU_ART.JOSHAU_EDGE;
    this.restY = GAME_HEIGHT - 22; // just the hair tips
    this.img = scene.add.image(opts.x, this.restY, TEX.MENU_JOSHAU).setOrigin(0.5, 0).setDepth(DEPTH.FX);

    const side = opts.bubble ?? 'left';
    const g = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', textStyle(16, THEME.colors.bgHex, { fontStyle: 'bold', wordWrap: { width: BUBBLE_W - 28 }, align: 'center' })).setOrigin(0.5);
    this.bubble = scene.add.container(0, 0, [g, this.text]).setDepth(DEPTH.FX + 1).setAlpha(0);
    // bubble anchor: left of his head, or above it
    const bx = side === 'left' ? opts.x - 160 : opts.x - 20;
    const by = side === 'left' ? this.peekY + 44 : this.peekY - 62;
    this.bubble.setPosition(bx, by);
    // tail tip: his left temple (bubble on the left) or the top of his hair (bubble above)
    const tip = side === 'left' ? { x: opts.x - 50, y: this.peekY + 58 } : { x: opts.x - 22, y: this.peekY + 18 };
    this.drawBubble(g, side, tip.x - bx, tip.y - by);
  }

  /** Pop up with a line; holds `holdMs` then ducks unless `stayUp`. Ignored while a peek is in progress. */
  peek(line: string, holdMs = 2800, stayUp = false): void {
    if (this.busy) return;
    this.busy = true;
    this.text.setText(line);
    this.scene.tweens.add({ targets: this.img, y: this.peekY, duration: RISE_MS, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.bubble, alpha: 1, duration: 200, delay: RISE_MS - 100 });
    if (stayUp) return;
    this.scene.time.delayedCall(RISE_MS + holdMs, () => {
      this.scene.tweens.add({ targets: this.bubble, alpha: 0, duration: 150 });
      this.scene.tweens.add({ targets: this.img, y: this.restY, duration: DUCK_MS, ease: 'Sine.easeIn', onComplete: () => (this.busy = false) });
    });
  }

  private drawBubble(g: Phaser.GameObjects.Graphics, side: 'left' | 'above', tailX: number, tailY: number): void {
    const w = BUBBLE_W;
    const h = 62;
    g.fillStyle(0x140a04, 0.45);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
    g.fillStyle(0xfff1d6, 1);
    g.lineStyle(3, THEME.colors.poopDark, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    // tail toward his head
    const base = side === 'left' ? { x1: w / 2 - 2, y1: -6, x2: w / 2 - 2, y2: 14 } : { x1: 22, y1: h / 2 - 2, x2: 46, y2: h / 2 - 2 };
    g.fillStyle(0xfff1d6, 1);
    g.fillTriangle(base.x1, base.y1, base.x2, base.y2, tailX, tailY);
    g.lineStyle(3, THEME.colors.poopDark, 1);
    g.beginPath();
    g.moveTo(base.x1, base.y1);
    g.lineTo(tailX, tailY);
    g.lineTo(base.x2, base.y2);
    g.strokePath();
  }
}
