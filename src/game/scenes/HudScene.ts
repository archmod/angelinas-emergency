import Phaser from 'phaser';
import { GAME_WIDTH, SCENES } from '@/config/constants';
import type { InputManager } from '@/game/input/InputManager';
import { TouchSource } from '@/game/input/TouchSource';
import { THEME, textStyle } from '@/game/ui/theme';

export interface HudSceneData {
  input: InputManager;
  levelName: string;
}

/** Screen-fixed overlay: touch controls now; meters, icons and pause button in later milestones. */
export class HudScene extends Phaser.Scene {
  private touch: TouchSource | null = null;
  private removeTouch: (() => void) | null = null;

  constructor() {
    super(SCENES.HUD);
  }

  create(data: HudSceneData): void {
    const useTouch = this.sys.game.device.input.touch || navigator.maxTouchPoints > 0;
    if (useTouch) {
      this.touch = new TouchSource(this);
      this.removeTouch = data.input.addSource(this.touch);
    }

    this.add.text(GAME_WIDTH / 2, 12, data.levelName, textStyle(20, THEME.colors.textDim)).setOrigin(0.5, 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeTouch?.();
      this.touch?.destroy();
      this.touch = null;
    });
  }
}
