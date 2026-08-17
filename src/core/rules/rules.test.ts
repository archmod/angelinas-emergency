import { describe, expect, it } from 'vitest';
import { evaluateObjectives } from './objectives';
import { createPoopState, DEFAULT_POOP_CONFIG, stepPoop, type PoopEvent, type PoopInput } from './poopAction';
import { computeScore, type RunStats } from './score';
import { DEFAULT_URGENCY_CONFIG, isAccident, relieve, stepUrgency } from './urgency';

const input = (p: Partial<PoopInput> = {}): PoopInput => ({ held: true, spotMultiplier: 1, moving: false, interrupted: false, alerted: false, ...p });

describe('stepPoop', () => {
  it('completes after poopSeconds of holding, emitting noises along the way', () => {
    let s = createPoopState();
    const events: PoopEvent[] = [];
    for (let t = 0; t < 4; t += 1 / 60) {
      const r = stepPoop(s, input(), 1 / 60);
      s = r.state;
      events.push(...r.events);
      if (r.events.includes('completed')) break;
    }
    expect(events[0]).toBe('started');
    expect(events.filter((e) => e === 'noise').length).toBe(3); // every 0.8s → 0.8, 1.6, 2.4
    expect(events).toContain('completed');
    expect(s.completed).toBe(1);
    expect(s.progress).toBe(0);
    expect(s.active).toBe(false);
  });

  it('does nothing outside a spot or while moving', () => {
    const r1 = stepPoop(createPoopState(), input({ spotMultiplier: null }), 0.5);
    expect(r1.state.progress).toBe(0);
    expect(r1.events).toEqual([]);
    const r2 = stepPoop(createPoopState(), input({ moving: true }), 0.5);
    expect(r2.state.progress).toBe(0);
  });

  it('exposed spots are faster', () => {
    const r = stepPoop(createPoopState(), input({ spotMultiplier: 0.7 }), 1);
    expect(r.state.progress).toBeCloseTo(1 / (3 * 0.7));
  });

  it('releasing decays progress slowly; interruption stops and reports it', () => {
    let s = stepPoop(createPoopState(), input(), 1).state; // 1/3
    s = stepPoop(s, input({ held: false }), 1).state;
    expect(s.progress).toBeCloseTo(1 / 3 - DEFAULT_POOP_CONFIG.decayPerSecond);
    const r = stepPoop(stepPoop(createPoopState(), input(), 1).state, input({ interrupted: true }), 1 / 60);
    expect(r.events).toEqual(['interrupted']);
    expect(r.state.active).toBe(false);
  });

  it('being spotted (alerted) halves progress once', () => {
    let s = stepPoop(createPoopState(), input(), 1.5).state; // 0.5
    s = stepPoop(s, input({ alerted: true }), 1 / 60).state;
    expect(s.progress).toBeCloseTo(0.25, 2);
    s = stepPoop(s, input({ alerted: true }), 1 / 60).state;
    expect(s.progress).toBeCloseTo(0.25 - (2 * DEFAULT_POOP_CONFIG.decayPerSecond) / 60, 3); // no second halving, just decay
  });
});

describe('urgency', () => {
  it('fills over urgencySeconds, faster when running, and is relieved by pooping', () => {
    const cfg = { ...DEFAULT_URGENCY_CONFIG, urgencySeconds: 100 };
    expect(stepUrgency(0, 50, false, cfg)).toBeCloseTo(0.5);
    expect(stepUrgency(0, 50, true, cfg)).toBeCloseTo(0.75);
    expect(isAccident(stepUrgency(0.9, 20, false, cfg))).toBe(true);
    expect(relieve(0.9, cfg)).toBeCloseTo(0.2);
    expect(relieve(0.3, cfg)).toBe(0);
  });
});

describe('objectives', () => {
  const rules = { exitRequired: true };
  const requiredSpots = ['a', 'b'];
  const used = (...ids: string[]) => new Set(ids);

  it('requires every required spot, then the exit when the level has one', () => {
    expect(evaluateObjectives({ usedSpots: used(), requiredSpots, inExit: true, rules }).won).toBe(false);
    const half = evaluateObjectives({ usedSpots: used('a'), requiredSpots, inExit: false, rules });
    expect(half.requiredDone).toBe(1);
    expect(half.requiredTotal).toBe(2);
    expect(half.hint).toMatch(/hold GO/);
    const done = evaluateObjectives({ usedSpots: used('a', 'b'), requiredSpots, inExit: false, rules });
    expect(done.exitOpen).toBe(true);
    expect(done.won).toBe(false);
    expect(evaluateObjectives({ usedSpots: used('a', 'b'), requiredSpots, inExit: true, rules }).won).toBe(true);
  });
  it('optional spots do not count towards the objective', () => {
    const s = evaluateObjectives({ usedSpots: used('a', 'bonus-1', 'bonus-2'), requiredSpots, inExit: true, rules });
    expect(s.requiredDone).toBe(1);
    expect(s.exitOpen).toBe(false);
    expect(s.won).toBe(false);
  });
  it('wins immediately without an exit', () => {
    expect(evaluateObjectives({ usedSpots: used('a'), requiredSpots: ['a'], inExit: false, rules: { exitRequired: false } }).won).toBe(true);
  });
});

describe('score', () => {
  it('ranks clean fast runs S, clean slow runs A, one alert B, otherwise C', () => {
    const stats = (p: Partial<RunStats>): RunStats => ({ timeSeconds: 90, parSeconds: 60, timesSuspicious: 0, timesAlerted: 0, urgencyAtFinish: 0.2, farts: 0, forcedFarts: 0, ...p });
    expect(computeScore(stats({ timeSeconds: 40 }))).toMatchObject({ rank: 'S', stars: 3, score: 1100 });
    expect(computeScore(stats({ timesSuspicious: 1 })).rank).toBe('A');
    expect(computeScore(stats({ timesSuspicious: 3, timesAlerted: 1 }))).toMatchObject({ rank: 'B', stars: 2 });
    expect(computeScore(stats({ timesSuspicious: 3, timesAlerted: 4 }))).toMatchObject({ rank: 'C', stars: 1, score: 0 });
  });
});
