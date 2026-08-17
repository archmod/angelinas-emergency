import { describe, expect, it } from 'vitest';
import { createGasState, DEFAULT_GAS_CONFIG, fartNoise, releaseStrength, stepGas, ventGas, type GasEvent, type GasInput, type GasState } from './gas';

const input = (p: Partial<GasInput> = {}): GasInput => ({ urgency: 0, releasePressed: false, pooping: false, ...p });

/** Runs `seconds` of simulation at 60 Hz, collecting events. */
function simulate(s: GasState, seconds: number, inp: GasInput): { state: GasState; events: GasEvent[] } {
  const events: GasEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    const r = stepGas(s, inp, 1 / 60);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

describe('gas build-up', () => {
  it('fills over gasSeconds at zero urgency, warns at warnAt, then forces a fart at full', () => {
    const { state, events } = simulate(createGasState(), DEFAULT_GAS_CONFIG.gasSeconds + 0.1, input());
    expect(events.map((e) => e.type)).toEqual(['gurgle', 'fart']);
    const fart = events[1] as Extract<GasEvent, { type: 'fart' }>;
    expect(fart.forced).toBe(true);
    expect(fart.strength).toBe(1);
    expect(state.farts).toBe(1);
    expect(state.forcedFarts).toBe(1);
    expect(state.gas).toBeLessThan(0.01); // reset after the blast
    expect(state.warned).toBe(false); // warning re-armed
  });

  it('builds (1 + urgencyBoost)× faster at full urgency', () => {
    const calm = stepGas(createGasState(), input({ urgency: 0 }), 1).state.gas;
    const desperate = stepGas(createGasState(), input({ urgency: 1 }), 1).state.gas;
    expect(desperate / calm).toBeCloseTo(1 + DEFAULT_GAS_CONFIG.urgencyBoost);
    expect(calm).toBeCloseTo(1 / DEFAULT_GAS_CONFIG.gasSeconds);
  });

  it('does not build while pooping', () => {
    const s = stepGas({ ...createGasState(), gas: 0.4 }, input({ pooping: true }), 5).state;
    expect(s.gas).toBe(0.4);
  });

  it('warns exactly once per build-up', () => {
    const { events } = simulate({ ...createGasState(), gas: DEFAULT_GAS_CONFIG.warnAt - 0.01 }, 2, input());
    expect(events.filter((e) => e.type === 'gurgle').length).toBe(1);
  });
});

describe('deliberate release', () => {
  it('lets one out early: quieter the less gas there is, and resets the meter', () => {
    const start = { ...createGasState(), gas: 0.5 };
    const r = stepGas(start, input({ releasePressed: true }), 1 / 60);
    expect(r.events).toEqual([{ type: 'fart', forced: false, strength: releaseStrength(0.5, DEFAULT_GAS_CONFIG) }]);
    expect(releaseStrength(0.5, DEFAULT_GAS_CONFIG)).toBeCloseTo((0.5 - 0.2) / 0.8);
    expect(r.state.gas).toBeLessThan(0.01);
    expect(r.state.farts).toBe(1);
    expect(r.state.forcedFarts).toBe(0);
  });

  it('is a dud below minRelease', () => {
    const r = stepGas({ ...createGasState(), gas: 0.1 }, input({ releasePressed: true }), 1 / 60);
    expect(r.events).toEqual([{ type: 'dry' }]);
    expect(r.state.farts).toBe(0);
    expect(r.state.gas).toBeGreaterThan(0.1); // still building
  });

  it('releasing after the warning re-arms it', () => {
    let s = simulate({ ...createGasState(), gas: DEFAULT_GAS_CONFIG.warnAt }, 0.1, input()).state;
    expect(s.warned).toBe(true);
    s = stepGas(s, input({ releasePressed: true }), 1 / 60).state;
    expect(s.warned).toBe(false);
    const { events } = simulate(s, DEFAULT_GAS_CONFIG.gasSeconds * DEFAULT_GAS_CONFIG.warnAt + 0.2, input());
    expect(events.map((e) => e.type)).toEqual(['gurgle']);
  });

  it('a released fart in the same frame as full pressure does not double-fart', () => {
    const r = stepGas({ ...createGasState(), gas: 0.999 }, input({ releasePressed: true }), 1);
    expect(r.events.filter((e) => e.type === 'fart').length).toBe(1);
    expect(r.state.forcedFarts).toBe(0);
  });

  it('pooping vents everything', () => {
    const s = ventGas({ gas: 0.9, warned: true, farts: 2, forcedFarts: 1 });
    expect(s).toEqual({ gas: 0, warned: false, farts: 2, forcedFarts: 1 });
  });
});

describe('fartNoise', () => {
  const cfg = { quiet: { radius: 50, loudness: 0.25, pulses: 2 }, loud: { radius: 200, loudness: 0.8, pulses: 4 }, forcedRadiusMul: 1.25 };
  it('lerps quiet→loud by strength; forced carries farther', () => {
    expect(fartNoise(0, false, cfg)).toEqual({ radius: 50, loudness: 0.25, pulses: 2 });
    expect(fartNoise(1, false, cfg)).toEqual({ radius: 200, loudness: 0.8, pulses: 4 });
    expect(fartNoise(0.5, false, cfg)).toEqual({ radius: 125, loudness: 0.525, pulses: 3 });
    expect(fartNoise(1, true, cfg)).toEqual({ radius: 250, loudness: 0.8, pulses: 4 });
    expect(fartNoise(2, false, cfg).loudness).toBe(0.8); // clamped
  });
});
