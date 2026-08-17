/**
 * Device-agnostic input model. Every input source (keyboard, touch, later gamepad/replay) produces a
 * `SourceState` per frame; `InputManager` merges them and derives edge-triggered `*Pressed` flags.
 */
export interface SourceState {
  /** Movement vector, each component in [-1, 1]. Length may be < 1 for analog sticks. */
  moveX: number;
  moveY: number;
  run: boolean;
  sneak: boolean;
  /** Primary action (poop / interact) held. */
  action: boolean;
  pause: boolean;
}

export interface InputIntent extends SourceState {
  /** Length of the (clamped) move vector, 0..1. */
  moveMagnitude: number;
  actionPressed: boolean;
  actionReleased: boolean;
  pausePressed: boolean;
}

export const EMPTY_SOURCE: SourceState = { moveX: 0, moveY: 0, run: false, sneak: false, action: false, pause: false };

/** Clamps a move vector to unit length (diagonal keyboard input would otherwise be √2 fast). */
export const clampMove = (x: number, y: number): { x: number; y: number; magnitude: number } => {
  const m = Math.hypot(x, y);
  if (m > 1) return { x: x / m, y: y / m, magnitude: 1 };
  return { x, y, magnitude: m };
};

/** Merges several sources: the strongest move vector wins, booleans OR together. */
export function mergeSources(sources: readonly SourceState[]): SourceState {
  let best = EMPTY_SOURCE;
  let bestMag = -1;
  const out: SourceState = { ...EMPTY_SOURCE };
  for (const s of sources) {
    const mag = Math.hypot(s.moveX, s.moveY);
    if (mag > bestMag) {
      bestMag = mag;
      best = s;
    }
    out.run ||= s.run;
    out.sneak ||= s.sneak;
    out.action ||= s.action;
    out.pause ||= s.pause;
  }
  out.moveX = best.moveX;
  out.moveY = best.moveY;
  return out;
}

/** Derives the frame intent from the merged state and the previous frame's state (edge detection). */
export function deriveIntent(current: SourceState, previous: SourceState): InputIntent {
  const mv = clampMove(current.moveX, current.moveY);
  return {
    ...current,
    moveX: mv.x,
    moveY: mv.y,
    moveMagnitude: mv.magnitude,
    actionPressed: current.action && !previous.action,
    actionReleased: !current.action && previous.action,
    pausePressed: current.pause && !previous.pause,
  };
}
