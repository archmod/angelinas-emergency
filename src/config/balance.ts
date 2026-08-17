/**
 * Every gameplay tunable lives here so balancing on a phone is a one-file job.
 * Units: pixels, seconds, degrees unless noted.
 */
export const BALANCE = {
  player: {
    walkSpeed: 150,
    runSpeed: 250,
    sneakSpeed: 80,
    /** Circle body radius (px). Smaller than half a tile so Arcade doesn't snag on tile seams. */
    bodyRadius: 12,
    /** How fast the sprite turns to face movement (deg/s). */
    turnRateDeg: 900,
  },
  /** Footstep noise per stance (null = silent). radius = how far it carries, loudness 0..1. */
  noise: {
    sneak: null,
    walk: { radius: 40, loudness: 0.25 },
    run: { radius: 140, loudness: 0.7 },
  } as Record<'sneak' | 'walk' | 'run', { radius: number; loudness: number } | null>,
  camera: {
    zoom: 1.25,
    /** Follow smoothing (0..1 per frame, lower = smoother). */
    lerp: 0.12,
    /** Camera looks ahead in the movement direction by this many px (0 = off). */
    lookAhead: 0,
  },
  touch: {
    /** Left portion of the screen (0..1) that spawns the floating joystick. */
    joystickZone: 0.55,
    joystickRadius: 64,
    joystickDeadzone: 0.15,
    actionButtonRadius: 54,
    runButtonRadius: 44,
  },
} as const;
