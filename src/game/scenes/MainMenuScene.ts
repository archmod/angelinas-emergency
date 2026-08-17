import Phaser from 'phaser';
import { APP_VERSION, GAME_HEIGHT, GAME_WIDTH, REGISTRY, SCENES } from '@/config/constants';
import { firstIncompleteLevelId } from '@/core/rules/progress';
import type { DebugFlags } from '@/game/debug/flags';
import type { SaveManager } from '@/game/systems/SaveManager';
import { Button } from '@/game/ui/Button';
import { addSoundToggle } from '@/game/ui/SoundToggle';
import { THEME, textStyle } from '@/game/ui/theme';
import { CAMPAIGN } from '@/levels/registry';

/** Title screen. Buttons are user gestures, which also unlocks audio on iOS. */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MAIN_MENU);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const save = this.registry.get(REGISTRY.SAVE) as SaveManager;
    const progress = save.get();
    const flags = this.registry.get(REGISTRY.DEBUG_FLAGS) as DebugFlags;
    const continueId = flags.level ?? firstIncompleteLevelId(progress, CAMPAIGN);
    const done = Object.keys(progress.completed).filter((id) => CAMPAIGN.some((l) => l.id === id)).length;

    this.add.text(cx, GAME_HEIGHT * 0.26, "Angelina's Emergency", textStyle(72, THEME.colors.accent, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(cx, GAME_HEIGHT * 0.26 + 64, 'Find a spot. Do the deed. Don’t get caught.', textStyle(26, THEME.colors.textDim)).setOrigin(0.5);

    const play = () => this.scene.start(SCENES.GAME, { levelId: continueId });
    const levels = () => this.scene.start(SCENES.LEVEL_SELECT);
    new Button(this, cx, GAME_HEIGHT * 0.58, done > 0 && done < CAMPAIGN.length ? 'Continue' : 'Play', play, { width: 300, height: 72, fontSize: 30 });
    new Button(this, cx, GAME_HEIGHT * 0.58 + 90, `Levels  (${done}/${CAMPAIGN.length})`, levels, { width: 300, color: 0x9aa4b2 });

    this.add.text(cx, GAME_HEIGHT - 44, this.sys.game.device.input.touch ? 'Joystick: left side · GO / RUN: right side' : 'WASD / arrows move · Shift run · C sneak · Space/E = GO · Esc pause', textStyle(16, THEME.colors.textDim)).setOrigin(0.5);
    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 12, `v${APP_VERSION}`, textStyle(16, THEME.colors.textDim)).setOrigin(1, 1);
    addSoundToggle(this, 96, GAME_HEIGHT - 40);

    this.input.keyboard?.once('keydown-SPACE', play);
    this.input.keyboard?.once('keydown-ENTER', play);
    this.input.keyboard?.once('keydown-L', levels);
  }
}
