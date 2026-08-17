import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '@/config/constants';
import { generatePlaceholderTextures } from '@/game/art/placeholders';
import { THEME, textStyle } from '@/game/ui/theme';

/** Loads/generates all assets with a progress bar, then starts the main menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  preload(): void {
    const w = 420;
    const h = 14;
    const x = (GAME_WIDTH - w) / 2;
    const y = GAME_HEIGHT / 2;
    const track = this.add.rectangle(x, y, w, h, 0x000000, 0.35).setOrigin(0, 0.5);
    const bar = this.add.rectangle(x + 2, y, 0, h - 4, THEME.colors.accentHex).setOrigin(0, 0.5);
    this.add.text(GAME_WIDTH / 2, y - 40, 'Loading…', textStyle(22, THEME.colors.textDim)).setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      bar.width = Math.max(0, (w - 4) * value);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      track.destroy();
      bar.destroy();
    });

    // Nothing to fetch yet (placeholder art is generated in code). Real assets get queued here.
  }

  create(): void {
    generatePlaceholderTextures(this);
    this.scene.start(SCENES.MAIN_MENU);
  }
}
