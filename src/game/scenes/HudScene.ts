import Phaser from 'phaser';
import { GAME_WIDTH, SCENES } from '@/config/constants';
import type { BrainMode } from '@/core/ai/enemyBrain';
import type { InputManager } from '@/game/input/InputManager';
import type { EventBus } from '@/game/systems/EventBus';
import { TouchSource } from '@/game/input/TouchSource';
import { THEME, textStyle } from '@/game/ui/theme';

export interface HudSceneData {
  input: InputManager;
  levelName: string;
  bus: EventBus;
}

const ALERT_RANK: Record<BrainMode, number> = { patrol: 0, return: 0, suspicious: 1, search: 1, chase: 2 };
const ALERT_LABEL = ['UNSEEN', 'SUSPICIOUS', 'SPOTTED!'] as const;

/** Screen-fixed overlay: touch controls now; meters, icons and pause button in later milestones. */
export class HudScene extends Phaser.Scene {
  private touch: TouchSource | null = null;
  private removeTouch: (() => void) | null = null;
  private alertText!: Phaser.GameObjects.Text;
  private readonly enemyModes = new Map<string, BrainMode>();

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
    this.alertText = this.add.text(GAME_WIDTH - 20, 14, 'UNSEEN', textStyle(22, THEME.colors.ok, { fontStyle: 'bold' })).setOrigin(1, 0);

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
}
