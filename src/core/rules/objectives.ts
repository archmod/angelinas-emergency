import type { LevelRules } from '@/core/level/schema';

export interface ObjectiveInput {
  /** Ids of every spot pooped in so far (each spot is single-use). */
  usedSpots: ReadonlySet<string>;
  /** Ids of the spots that must all be used before the exit opens (the level's objectives). */
  requiredSpots: readonly string[];
  inExit: boolean;
  rules: LevelRules;
}

export interface ObjectiveStatus {
  /** Number of required spots in the level. */
  requiredTotal: number;
  /** How many of the required spots have been used. */
  requiredDone: number;
  /** All required spots done. */
  poopsDone: boolean;
  /** Exit is usable (required spots done and the level has an exit). */
  exitOpen: boolean;
  won: boolean;
  /** Short instruction for the HUD. */
  hint: string;
}

export function evaluateObjectives(i: ObjectiveInput): ObjectiveStatus {
  const requiredTotal = i.requiredSpots.length;
  const requiredDone = i.requiredSpots.filter((id) => i.usedSpots.has(id)).length;
  const remaining = requiredTotal - requiredDone;
  const poopsDone = remaining === 0;
  const exitOpen = poopsDone && i.rules.exitRequired;
  const won = poopsDone && (!i.rules.exitRequired || i.inExit);
  let hint: string;
  if (!poopsDone) {
    if (requiredTotal === 1) hint = 'Sneak to the pinned spot and hold GO to let it out';
    else if (remaining === 1) hint = 'One pinned spot left — hold GO there, quietly!';
    else hint = `${remaining} pinned spots to go — one poop each, quietly!`;
  } else if (i.rules.exitRequired) hint = 'Slip away to the exit. Act natural!';
  else hint = 'Phew. Nobody knows.';
  return { requiredTotal, requiredDone, poopsDone, exitOpen, won, hint };
}
