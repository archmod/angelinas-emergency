import Phaser from 'phaser';
import { APP_VERSION, GAME_HEIGHT, GAME_WIDTH, SCENES } from '@/config/constants';
import { THEME, textStyle } from '@/game/ui/theme';

/** Title screen. The "tap to start" gate guarantees a user gesture before any audio plays (iOS). */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MAIN_MENU);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, GAME_HEIGHT * 0.32, "Angelina's Emergency", textStyle(72, THEME.colors.accent, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT * 0.32 + 64, 'Find a spot. Do the deed. Don’t get caught.', textStyle(26, THEME.colors.textDim))
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.66, this.sys.game.device.input.touch ? 'Tap to start' : 'Click or press Space to start', textStyle(32))
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(GAME_WIDTH - 16, GAME_HEIGHT - 12, `v${APP_VERSION}`, textStyle(16, THEME.colors.textDim))
      .setOrigin(1, 1);

    const start = () => this.scene.start(SCENES.GAME);
    this.input.once(Phaser.Input.Events.POINTER_UP, start);
    this.input.keyboard?.once('keydown-SPACE', start);
    this.input.keyboard?.once('keydown-ENTER', start);
  }
}
