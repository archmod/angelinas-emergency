import { BALANCE } from '@/config/balance';
import type { LevelData, Rect } from '@/core/level/schema';
import { evaluateObjectives, type ObjectiveStatus } from '@/core/rules/objectives';
import type { RunStats } from '@/core/rules/score';
import { isAccident, relieve, stepUrgency, type UrgencyConfig } from '@/core/rules/urgency';

const rectContains = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Per-run bookkeeping shared with the HUD: urgency, poop count, objectives, stats. Plain object, no Phaser. */
export class RunState {
  elapsed = 0;
  urgency = 0;
  poopsCompleted = 0;
  timesSuspicious = 0;
  timesAlerted = 0;
  objectives: ObjectiveStatus;
  /** Poop progress 0..1 mirrored from the PoopSystem for the HUD. */
  poopProgress = 0;
  /** Gas meter 0..1 and fart counts mirrored from the FartSystem (HUD + result stats). */
  gas = 0;
  farts = 0;
  forcedFarts = 0;
  private readonly urgencyCfg: UrgencyConfig;

  constructor(readonly level: LevelData) {
    this.urgencyCfg = { urgencySeconds: level.meta.urgencySeconds, ...BALANCE.urgency };
    this.objectives = this.evaluate(false);
  }

  private evaluate(inExit: boolean): ObjectiveStatus {
    return evaluateObjectives({ poopsCompleted: this.poopsCompleted, inExit, rules: this.level.rules });
  }

  /** Advances timers/urgency. Returns 'accident' when the urgency meter overflows. */
  tick(dt: number, running: boolean, playerX: number, playerY: number): 'accident' | 'won' | null {
    this.elapsed += dt;
    this.urgency = stepUrgency(this.urgency, dt, running, this.urgencyCfg);
    const inExit = this.level.exit !== null && rectContains(this.level.exit, playerX, playerY);
    this.objectives = this.evaluate(inExit);
    if (this.objectives.won) return 'won';
    if (isAccident(this.urgency)) return 'accident';
    return null;
  }

  onPoopCompleted(): void {
    this.poopsCompleted += 1;
    this.urgency = relieve(this.urgency, this.urgencyCfg);
  }

  stats(): RunStats {
    return {
      timeSeconds: this.elapsed,
      parSeconds: this.level.meta.parSeconds,
      timesSuspicious: this.timesSuspicious,
      timesAlerted: this.timesAlerted,
      urgencyAtFinish: this.urgency,
      farts: this.farts,
      forcedFarts: this.forcedFarts,
    };
  }
}
