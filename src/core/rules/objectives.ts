import type { LevelRules } from '@/core/level/schema';

export interface ObjectiveInput {
  poopsCompleted: number;
  inExit: boolean;
  rules: LevelRules;
}

export interface ObjectiveStatus {
  /** All required poops done. */
  poopsDone: boolean;
  /** Exit is usable (poops done and the level has an exit). */
  exitOpen: boolean;
  won: boolean;
  /** Short instruction for the HUD. */
  hint: string;
}

export function evaluateObjectives(i: ObjectiveInput): ObjectiveStatus {
  const remaining = Math.max(0, i.rules.requiredPoops - i.poopsCompleted);
  const poopsDone = remaining === 0;
  const exitOpen = poopsDone && i.rules.exitRequired;
  const won = poopsDone && (!i.rules.exitRequired || i.inExit);
  let hint: string;
  if (!poopsDone) hint = remaining === 1 ? 'Find a private spot and hold GO to let it out' : `${remaining} more to go — quietly!`;
  else if (i.rules.exitRequired) hint = 'Slip away to the exit. Act natural!';
  else hint = 'Phew. Nobody knows.';
  return { poopsDone, exitOpen, won, hint };
}
