/**
 * Hold-to-poop logic (pure). The engine tells us each frame whether the button is held, whether the
 * player stands still inside a spot, and whether enemies are suspicious/alerted; we return the new
 * progress plus events to react to (noise, completion, interruption).
 */
export interface PoopConfig {
  /** Seconds of uninterrupted holding to finish, at durationMultiplier 1. */
  poopSeconds: number;
  /** Progress lost per second while not actively pooping (0..1 units). */
  decayPerSecond: number;
  /** Seconds between poop noises while active. */
  noiseInterval: number;
}

export interface PoopState {
  progress: number; // 0..1
  active: boolean;
  noiseTimer: number;
  completed: number;
  /** Set for one step when progress was halved by an alert (for feedback). */
  alertedPenaltyApplied: boolean;
}

export interface PoopInput {
  held: boolean;
  /** Duration multiplier of the spot the player is standing in, or null when not in a spot. */
  spotMultiplier: number | null;
  /** True if the player is trying to move (movement cancels the action). */
  moving: boolean;
  /** An enemy is suspicious/searching AND currently sees the player → can't poop. */
  interrupted: boolean;
  /** An enemy is chasing → progress halved once, can't poop. */
  alerted: boolean;
}

export type PoopEvent = 'started' | 'noise' | 'completed' | 'interrupted' | 'stopped';

export const DEFAULT_POOP_CONFIG: PoopConfig = { poopSeconds: 3, decayPerSecond: 0.1, noiseInterval: 0.8 };

export const createPoopState = (): PoopState => ({ progress: 0, active: false, noiseTimer: 0, completed: 0, alertedPenaltyApplied: false });

export function stepPoop(prev: PoopState, input: PoopInput, dt: number, cfg: PoopConfig = DEFAULT_POOP_CONFIG): { state: PoopState; events: PoopEvent[] } {
  const s: PoopState = { ...prev };
  const events: PoopEvent[] = [];

  if (input.alerted && !s.alertedPenaltyApplied && s.progress > 0) {
    s.progress *= 0.5;
    s.alertedPenaltyApplied = true;
  }
  if (!input.alerted) s.alertedPenaltyApplied = false;

  const canAct = input.held && input.spotMultiplier !== null && !input.moving && !input.interrupted && !input.alerted;

  if (canAct) {
    if (!s.active) {
      s.active = true;
      s.noiseTimer = 0;
      events.push('started');
    }
    const mult = input.spotMultiplier ?? 1;
    s.progress += dt / (cfg.poopSeconds * mult);
    s.noiseTimer += dt;
    if (s.noiseTimer >= cfg.noiseInterval) {
      s.noiseTimer -= cfg.noiseInterval;
      events.push('noise');
    }
    if (s.progress >= 1) {
      s.progress = 0;
      s.active = false;
      s.completed += 1;
      events.push('completed');
    }
  } else {
    if (s.active) {
      s.active = false;
      events.push(input.interrupted || input.alerted ? 'interrupted' : 'stopped');
    }
    s.progress = Math.max(0, s.progress - cfg.decayPerSecond * dt);
  }
  return { state: s, events };
}
