import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '@/config/constants';
import { computeScore, type RunStats } from '@/core/rules/score';
import { Button } from '@/game/ui/Button';
import { THEME, textStyle } from '@/game/ui/theme';

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
    this.cameras.main.setBackgroundColor(THEME.colors.bgHex);

    const title = win ? 'Relief!' : data.reason === 'accident' ? 'Oh no… too late!' : 'Caught!';
    this.add.text(cx, GAME_HEIGHT * 0.2, title, textStyle(64, win ? THEME.colors.ok : THEME.colors.danger, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(cx, GAME_HEIGHT * 0.2 + 56, data.levelName, textStyle(24, THEME.colors.textDim)).setOrigin(0.5);

    const s = data.stats;
    const lines = [`Time  ${fmtTime(s.timeSeconds)}  (par ${fmtTime(s.parSeconds)})`, `Suspicious  ${s.timesSuspicious}   Spotted  ${s.timesAlerted}`];
    if (win) {
      const score = computeScore(s);
      this.add.text(cx, GAME_HEIGHT * 0.42, score.rank, textStyle(120, THEME.colors.accent, { fontStyle: 'bold' })).setOrigin(0.5);
      this.add.text(cx, GAME_HEIGHT * 0.42 + 78, `${'★'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}   ${score.score} pts`, textStyle(28, THEME.colors.warn)).setOrigin(0.5);
    }
    this.add.text(cx, GAME_HEIGHT * 0.66, lines.join('\n'), textStyle(22, THEME.colors.text, { align: 'center' })).setOrigin(0.5);

    const retry = () => this.scene.start(SCENES.GAME, { levelId: data.levelId });
    const menu = () => this.scene.start(SCENES.MAIN_MENU);
    new Button(this, cx - 150, GAME_HEIGHT * 0.84, win ? 'Play again' : 'Try again', retry);
    new Button(this, cx + 150, GAME_HEIGHT * 0.84, 'Main menu', menu, { color: 0x9aa4b2 });
    this.input.keyboard?.once('keydown-SPACE', retry);
    this.input.keyboard?.once('keydown-ENTER', retry);
    this.input.keyboard?.once('keydown-ESC', menu);
  }
}
