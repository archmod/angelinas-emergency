/**
 * Gas pressure (pure). Angelina's gas meter (0..1) builds up over time — faster the more urgent she is — and when it
 * fills she farts whether she wants to or not (loud, carries far). She can let one out early on purpose: the earlier
 * (less gas), the quieter. Pooping vents it all. The engine turns 'fart' events into noise enemies can hear.
 */
export interface GasConfig {
  /** Seconds from empty to full at zero urgency. */
  gasSeconds: number;
  /** Build-up rate multiplier grows linearly to (1 + urgencyBoost) at full urgency. */
  urgencyBoost: number;
  /** Minimum gas needed to let one out on purpose (below it: nothing happens). */
  minRelease: number;
  /** Gas level (0..1) at which the rumbling warning fires. */
  warnAt: number;
}

export interface GasState {
  gas: number; // 0..1
  /** The warning already fired for the current build-up. */
  warned: boolean;
  farts: number;
  forcedFarts: number;
}

export interface GasInput {
  /** Current urgency 0..1 (gas builds faster when she really has to go). */
  urgency: number;
  /** Fart button pressed this frame (edge). */
  releasePressed: boolean;
  /** Actively pooping: gas doesn't build (it's all coming out anyway). */
  pooping: boolean;
}

export type GasEvent =
  /** Warning: she's about to lose it (gas crossed warnAt). */
  | { type: 'gurgle' }
  /** A fart happened. `strength` 0..1 drives loudness/size; `forced` = it slipped out on its own at full pressure. */
  | { type: 'fart'; forced: boolean; strength: number }
  /** Pressed release with too little gas — nothing came out. */
  | { type: 'dry' };

export interface FartNoiseConfig {
  /** Quietest deliberate toot: how far it carries, how loud, and how many noise pulses it lasts. */
  quiet: { radius: number; loudness: number; pulses: number };
  /** Full-pressure fart. */
  loud: { radius: number; loudness: number; pulses: number };
  /** Involuntary farts carry farther than a deliberate one at the same pressure. */
  forcedRadiusMul: number;
}

export const DEFAULT_GAS_CONFIG: GasConfig = { gasSeconds: 45, urgencyBoost: 2, minRelease: 0.2, warnAt: 0.7 };

export const createGasState = (): GasState => ({ gas: 0, warned: false, farts: 0, forcedFarts: 0 });

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Deliberate release strength: 0 at minRelease, 1 at full. */
export const releaseStrength = (gas: number, cfg: GasConfig): number => clamp01((gas - cfg.minRelease) / Math.max(1e-6, 1 - cfg.minRelease));

export function stepGas(prev: GasState, input: GasInput, dt: number, cfg: GasConfig = DEFAULT_GAS_CONFIG): { state: GasState; events: GasEvent[] } {
  const s: GasState = { ...prev };
  const events: GasEvent[] = [];
  const fart = (forced: boolean, strength: number): void => {
    s.gas = 0;
    s.warned = false;
    s.farts += 1;
    if (forced) s.forcedFarts += 1;
    events.push({ type: 'fart', forced, strength });
  };

  if (input.releasePressed) {
    if (s.gas >= cfg.minRelease) fart(false, releaseStrength(s.gas, cfg));
    else events.push({ type: 'dry' });
  }

  if (!input.pooping) {
    const rate = (1 / cfg.gasSeconds) * (1 + cfg.urgencyBoost * clamp01(input.urgency));
    s.gas += rate * dt;
  }
  if (!s.warned && s.gas >= cfg.warnAt && s.gas < 1) {
    s.warned = true;
    events.push({ type: 'gurgle' });
  }
  if (s.gas >= 1) fart(true, 1);
  return { state: s, events };
}

/** Pooping vents everything: gas back to zero, warning re-armed. */
export const ventGas = (s: GasState): GasState => ({ ...s, gas: 0, warned: false });

/** Radius/loudness/pulse count of a fart for a given strength (lerp quiet→loud); forced ones carry farther. */
export function fartNoise(strength: number, forced: boolean, cfg: FartNoiseConfig): { radius: number; loudness: number; pulses: number } {
  const t = clamp01(strength);
  const lerp = (a: number, b: number): number => a + (b - a) * t;
  return {
    radius: lerp(cfg.quiet.radius, cfg.loud.radius) * (forced ? cfg.forcedRadiusMul : 1),
    loudness: lerp(cfg.quiet.loudness, cfg.loud.loudness),
    pulses: Math.max(1, Math.round(lerp(cfg.quiet.pulses, cfg.loud.pulses))),
  };
}
