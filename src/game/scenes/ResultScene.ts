import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY, SCENES } from '@/config/constants';
import { isUnlocked, nextLevelId, recordResult } from '@/core/rules/progress';
import { computeScore, type RunStats } from '@/core/rules/score';
import { TEX } from '@/game/art/AssetKeys';
import type { SaveManager } from '@/game/systems/SaveManager';
import { Button } from '@/game/ui/Button';
import { Joshau } from '@/game/ui/Joshau';
import { addMenuBackdrop } from '@/game/ui/MenuBackdrop';
import { headingStyle, THEME, textStyle } from '@/game/ui/theme';
import { CAMPAIGN } from '@/levels/registry';

export interface ResultSceneData {
  outcome: 'win' | 'lose';
  reason?: 'caught' | 'accident';
  levelId: string;
  levelName: string;
  stats: RunStats;
}

const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

/** Win/lose screen with rank and stats. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENES.RESULT);
  }

  create(data: ResultSceneData): void {
    const cx = GAME_WIDTH / 2;
    const win = data.outcome === 'win';
    addMenuBackdrop(this);

    const accident = !win && data.reason === 'accident';
    const title = win ? 'Sweet relief!' : accident ? 'Too late…' : 'Busted!';
    const flavor = win ? 'Nobody saw a thing. Joshau still has no clue.' : accident ? 'She couldn’t hold it. Now EVERYONE knows.' : 'Someone saw her — and Joshau is going to hear about it.';
    this.add.text(cx, GAME_HEIGHT * 0.2, title, headingStyle(68, win ? THEME.colors.ok : THEME.colors.danger)).setOrigin(0.5);
    this.add.text(cx, GAME_HEIGHT * 0.2 + 56, flavor, textStyle(22, THEME.colors.text)).setOrigin(0.5);
    this.add.text(cx, GAME_HEIGHT * 0.2 + 86, data.levelName, textStyle(18, THEME.colors.textDim)).setOrigin(0.5);
    // Joshau lurks below the edge and pops up with his verdict
    const joshau = new Joshau(this, { x: 1175, bubble: 'above' });
    this.time.delayedCall(900, () => joshau.peek(win ? 'Hmm… nothing? I’ll get you next time.' : accident ? '…did you just—?!' : 'GOTCHA! I KNEW it!', 0, true));

    const s = data.stats;
    const lines = [`Time  ${fmtTime(s.timeSeconds)}  (par ${fmtTime(s.parSeconds)})`, `Suspicious looks  ${s.timesSuspicious}   Times spotted  ${s.timesAlerted}`];
    const save = this.registry.get(REGISTRY.SAVE) as SaveManager;
    let nextId: string | null = null;
    if (win) {
      const score = computeScore(s);
      save.set(recordResult(save.get(), data.levelId, { stars: score.stars, rank: score.rank, score: score.score, timeSeconds: s.timeSeconds }));
      const candidate = nextLevelId(CAMPAIGN, data.levelId);
      if (candidate && isUnlocked(save.get(), CAMPAIGN, candidate)) nextId = candidate;
      this.add.text(cx, GAME_HEIGHT * 0.42, score.rank, headingStyle(120, THEME.colors.accent)).setOrigin(0.5);
      // the relieved poop mascot cheers next to the rank
      const poop = this.add.image(cx - 190, GAME_HEIGHT * 0.42 + 10, TEX.MENU_POOP).setScale(0.5).setAngle(-6);
      this.tweens.add({ targets: poop, y: poop.y - 10, angle: 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(cx, GAME_HEIGHT * 0.42 + 78, `${'★'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}   ${score.score} pts`, textStyle(28, THEME.colors.warn)).setOrigin(0.5);
    }
    this.add.text(cx, GAME_HEIGHT * 0.66, lines.join('\n'), textStyle(22, THEME.colors.text, { align: 'center' })).setOrigin(0.5);

    const retry = () => this.scene.start(SCENES.GAME, { levelId: data.levelId });
    const menu = () => this.scene.start(SCENES.MAIN_MENU);
    const next = () => nextId && this.scene.start(SCENES.GAME, { levelId: nextId });
    const primary = nextId ? next : retry;
    const y = GAME_HEIGHT * 0.84;
    if (nextId) {
      new Button(this, cx - 290, y, 'Next level ›', next, { width: 250 });
      new Button(this, cx, y, 'Play again', retry, { width: 250, color: THEME.button.warn });
      new Button(this, cx + 290, y, 'Main menu', menu, { width: 250, color: THEME.button.poop });
    } else {
      new Button(this, cx - 150, y, win ? 'Play again' : 'Sneak back in', retry);
      new Button(this, cx + 150, y, 'Main menu', menu, { color: THEME.button.poop });
    }
    this.input.keyboard?.once('keydown-SPACE', primary);
    this.input.keyboard?.once('keydown-ENTER', primary);
    this.input.keyboard?.once('keydown-ESC', menu);
  }
}
