import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '@/config/constants';
import { Button } from '@/game/ui/Button';
import { addSoundToggle } from '@/game/ui/SoundToggle';
import { headingStyle, THEME } from '@/game/ui/theme';

/** Overlay launched above the paused Game + Hud scenes. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, THEME.colors.bg, 0.7);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, 'Holding it in…', headingStyle(60)).setOrigin(0.5);

    const resume = () => {
      this.scene.resume(SCENES.GAME);
      this.scene.resume(SCENES.HUD);
      this.scene.stop();
    };
    const restart = () => {
      this.scene.stop();
      this.scene.get(SCENES.GAME).scene.restart();
    };
    const menu = () => {
      this.scene.stop();
      this.scene.stop(SCENES.GAME);
      this.scene.start(SCENES.MAIN_MENU);
    };
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.5, 'Keep sneaking', resume);
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.5 + 84, 'Restart level', restart, { color: THEME.button.warn });
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.5 + 168, 'Main menu', menu, { color: THEME.button.poop });
    addSoundToggle(this, GAME_WIDTH - 110, GAME_HEIGHT - 44);
    this.input.keyboard?.on('keydown-ESC', resume);
    this.input.keyboard?.on('keydown-P', resume);
    this.input.keyboard?.on('keydown-R', restart);
  }
}
