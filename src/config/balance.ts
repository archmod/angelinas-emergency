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
  poop: {
    poopSeconds: 3,
    decayPerSecond: 0.1,
    noiseInterval: 0.8,
    noiseRadius: 140,
    noiseLoudness: 0.5,
  },
  urgency: {
    runMultiplier: 1.5,
    reliefPerPoop: 0.7,
  },
  /** Gas builds up alongside urgency; when it fills she farts whether she likes it or not (see core/rules/gas.ts). */
  fart: {
    /** Seconds from empty to full at zero urgency. */
    gasSeconds: 45,
    /** Build-up rate multiplier grows to (1 + urgencyBoost) at full urgency. */
    urgencyBoost: 2,
    /** Minimum gas needed to let one out on purpose. */
    minRelease: 0.2,
    /** Gas level where the rumbling warning starts. */
    warnAt: 0.7,
    /**
     * A fart is a short burst of noise pulses (enemy awareness accumulates per pulse, like footsteps): a deliberate
     * toot at minRelease is quiet and short, a full-pressure one is loud and long; forced ones carry farther still.
     */
    noise: {
      quiet: { radius: 50, loudness: 0.25, pulses: 2 },
      loud: { radius: 200, loudness: 0.8, pulses: 4 },
      pulseInterval: 0.15,
      forcedRadiusMul: 1.25,
    },
    /** The cloud hangs around; an enemy who walks into it gets a whiff (perceived like a noise of this level, once per enemy). */
    cloud: { lingerSeconds: 4, radius: 28, smellLevel: 0.8 },
  },
  enemy: {
    /** How long an enemy is stalled after stepping in poop. */
    slipSeconds: 1.6,
  },
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
    fartButtonRadius: 40,
  },
} as const;
