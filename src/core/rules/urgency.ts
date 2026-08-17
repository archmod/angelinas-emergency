/** Angelina's need-to-go meter (0..1). Full = accident = level lost. Pure. */
export interface UrgencyConfig {
  /** Seconds from empty to full while walking. */
  urgencySeconds: number;
  /** Multiplier while running (exertion). */
  runMultiplier: number;
  /** How much a completed poop relieves the meter. */
  reliefPerPoop: number;
}

export const DEFAULT_URGENCY_CONFIG: UrgencyConfig = { urgencySeconds: 120, runMultiplier: 1.5, reliefPerPoop: 0.7 };

export function stepUrgency(value: number, dt: number, running: boolean, cfg: UrgencyConfig): number {
  const rate = (1 / cfg.urgencySeconds) * (running ? cfg.runMultiplier : 1);
  return Math.min(1, value + rate * dt);
}

export const relieve = (value: number, cfg: UrgencyConfig): number => Math.max(0, value - cfg.reliefPerPoop);
export const isAccident = (value: number): boolean => value >= 1;
