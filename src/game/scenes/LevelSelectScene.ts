import Phaser from 'phaser';
import { GAME_WIDTH, REGISTRY, SCENES } from '@/config/constants';
import type { WorldId } from '@/core/level/schema';
import { TEX } from '@/game/art/AssetKeys';
import { isUnlocked } from '@/core/rules/progress';
import type { SaveManager } from '@/game/systems/SaveManager';
import { Button } from '@/game/ui/Button';
import { addMenuBackdrop } from '@/game/ui/MenuBackdrop';
import { headingStyle, THEME, textStyle } from '@/game/ui/theme';
import { CAMPAIGN, WORLD_NAMES } from '@/levels/registry';

const CARD_W = 230;
const CARD_H = 110;
const GAP = 24;

/** Campaign level grid grouped by world, with stars/rank and lock state. */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENES.LEVEL_SELECT);
  }

  create(): void {
    const save = this.registry.get(REGISTRY.SAVE) as SaveManager;
    const progress = save.get();

    addMenuBackdrop(this);
    this.add.text(GAME_WIDTH / 2, 40, 'Pick a spot', headingStyle(44)).setOrigin(0.5);
    new Button(this, 90, 40, '‹ Back', () => this.scene.start(SCENES.MAIN_MENU), { width: 130, height: 48, color: THEME.button.muted, fontSize: 20 });
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SCENES.MAIN_MENU));

    const worlds: WorldId[] = ['park', 'neighborhood', 'school'];
    let y = 100;
    for (const world of worlds) {
      const levels = CAMPAIGN.filter((l) => l.world === world);
      if (levels.length === 0) continue;
      this.add.text(GAME_WIDTH / 2, y, WORLD_NAMES[world], headingStyle(26, THEME.colors.accent)).setOrigin(0.5, 0);
      y += 40;
      const perRow = Math.min(levels.length, 4);
      const rowW = perRow * CARD_W + (perRow - 1) * GAP;
      levels.forEach((lvl, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = GAME_WIDTH / 2 - rowW / 2 + col * (CARD_W + GAP) + CARD_W / 2;
        const cy = y + row * (CARD_H + GAP) + CARD_H / 2;
        const unlocked = isUnlocked(progress, CAMPAIGN, lvl.id);
        const best = progress.completed[lvl.id];
        this.card(x, cy, i + 1, lvl.name, unlocked, best ? `${'★'.repeat(best.stars)}${'☆'.repeat(3 - best.stars)}  ${best.rank}` : unlocked ? 'Not yet played' : 'Locked', () => {
          if (unlocked) this.scene.start(SCENES.GAME, { levelId: lvl.id });
        });
      });
      y += Math.ceil(levels.length / perRow) * (CARD_H + GAP) + 16;
    }
  }

  private card(x: number, y: number, index: number, name: string, unlocked: boolean, sub: string, onClick: () => void): void {
    const g = this.add.graphics();
    // drop shadow + chunky card in the button palette (unlocked: poop-brown outline; locked: sunken and dim)
    g.fillStyle(0x140a04, 0.5);
    g.fillRoundedRect(x - CARD_W / 2, y - CARD_H / 2 + 5, CARD_W, CARD_H, 18);
    g.fillStyle(unlocked ? THEME.colors.panel : 0x2a1a10, 1);
    g.fillRoundedRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, 18);
    g.lineStyle(3, unlocked ? THEME.colors.poop : 0x4a3221, 1);
    g.strokeRoundedRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, 18);
    // level number on a footprint stamp
    this.add
      .image(x - CARD_W / 2 + 30, y - CARD_H / 2 + 30, TEX.MENU_FOOTPRINT)
      .setScale(0.5)
      .setAlpha(unlocked ? 1 : 0.5)
      .setTint(unlocked ? THEME.colors.frog : 0x6b5342);
    this.add.text(x - CARD_W / 2 + 30, y - CARD_H / 2 + 37, `${index}`, textStyle(19, unlocked ? THEME.colors.bgHex : THEME.colors.textDim, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(x - CARD_W / 2 + 58, y - CARD_H / 2 + 18, name, textStyle(20, unlocked ? THEME.colors.text : THEME.colors.textDim, { fontStyle: 'bold' }));
    this.add.text(x - CARD_W / 2 + 16, y + CARD_H / 2 - 36, unlocked ? sub : '🔒 ' + sub, textStyle(18, unlocked ? THEME.colors.warn : THEME.colors.textDim));
    const zone = this.add.zone(x, y, CARD_W, CARD_H).setInteractive({ useHandCursor: unlocked });
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClick);
  }
}
