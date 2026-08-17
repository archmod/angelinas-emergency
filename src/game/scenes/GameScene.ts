import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '@/config/constants';
import { THEME, textStyle } from '@/game/ui/theme';

/**
 * M0 smoke-test scene: proves rendering, the game loop, multi-touch and keyboard input on the device.
 * Replaced by the real level scene in M1.
 */
export class GameScene extends Phaser.Scene {
  private box!: Phaser.GameObjects.Rectangle;
  private info!: Phaser.GameObjects.Text;
  private taps = 0;
  private vx = 220;
  private vy = 160;

  constructor() {
    super(SCENES.GAME);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(THEME.colors.bgHex);
    this.add.grid(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 64, 64, 0x000000, 0, 0xffffff, 0.06);

    this.box = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 80, 80, THEME.colors.accentHex);
    this.info = this.add.text(16, 16, '', textStyle(20));
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 24, 'M0 smoke test — tap/click anywhere · Esc = menu', textStyle(18, THEME.colors.textDim)).setOrigin(0.5, 1);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.taps += 1;
      const ring = this.add.circle(p.worldX, p.worldY, 10, THEME.colors.accentHex, 0.6);
      this.tweens.add({ targets: ring, radius: 60, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENES.MAIN_MENU));
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.box.x += this.vx * dt;
    this.box.y += this.vy * dt;
    if (this.box.x < 40 || this.box.x > GAME_WIDTH - 40) this.vx *= -1;
    if (this.box.y < 40 || this.box.y > GAME_HEIGHT - 40) this.vy *= -1;

    const active = this.input.manager.pointers.filter((p) => p.isDown).map((p) => `#${p.id}`);
    this.info.setText(
      [
        `fps ${Math.round(this.game.loop.actualFps)}`,
        `taps ${this.taps}`,
        `pointers down: ${active.length ? active.join(' ') : '—'}`,
        `renderer ${this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'}`,
        `display ${this.scale.displaySize.width | 0}×${this.scale.displaySize.height | 0} @${window.devicePixelRatio}x`,
      ].join('\n'),
    );
  }
}
