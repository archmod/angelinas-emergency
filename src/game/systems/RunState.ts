import { BALANCE } from '@/config/balance';
import { requiredSpots, type LevelData, type PoopSpotDef, type Rect } from '@/core/level/schema';
import { evaluateObjectives, type ObjectiveStatus } from '@/core/rules/objectives';
import type { RunStats } from '@/core/rules/score';
import { isAccident, relieve, stepUrgency, type UrgencyConfig } from '@/core/rules/urgency';

const rectContains = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Per-run bookkeeping shared with the HUD: urgency, poop count, objectives, stats. Plain object, no Phaser. */
export class RunState {
  elapsed = 0;
  urgency = 0;
  /** Every completed poop, required or optional (each spot can only be used once). */
  poopsCompleted = 0;
  /** Ids of the spots already pooped in. */
  readonly usedSpots = new Set<string>();
  /** Ids of the spots that must all be used to open the exit. */
  readonly requiredSpotIds: readonly string[];
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
  private inExit = false;

  constructor(readonly level: LevelData) {
    this.urgencyCfg = { urgencySeconds: level.meta.urgencySeconds, ...BALANCE.urgency };
    this.requiredSpotIds = requiredSpots(level.poopSpots).map((s) => s.id);
    this.objectives = this.evaluate(false);
  }

  private evaluate(inExit: boolean): ObjectiveStatus {
    return evaluateObjectives({ usedSpots: this.usedSpots, requiredSpots: this.requiredSpotIds, inExit, rules: this.level.rules });
  }

  /** Advances timers/urgency. Returns 'accident' when the urgency meter overflows. */
  tick(dt: number, running: boolean, playerX: number, playerY: number): 'accident' | 'won' | null {
    this.elapsed += dt;
    this.urgency = stepUrgency(this.urgency, dt, running, this.urgencyCfg);
    this.inExit = this.level.exit !== null && rectContains(this.level.exit, playerX, playerY);
    this.objectives = this.evaluate(this.inExit);
    if (this.objectives.won) return 'won';
    if (isAccident(this.urgency)) return 'accident';
    return null;
  }

  /** A poop finished in `spot`, which is now spent. Optional spots relieve urgency but don't count. */
  onPoopCompleted(spot: PoopSpotDef): void {
    this.poopsCompleted += 1;
    this.usedSpots.add(spot.id);
    this.urgency = relieve(this.urgency, this.urgencyCfg);
    this.objectives = this.evaluate(this.inExit); // keep the status current for callers reacting to this poop
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
