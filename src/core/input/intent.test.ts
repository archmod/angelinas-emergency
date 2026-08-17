import { describe, expect, it } from 'vitest';
import { EMPTY_SOURCE, deriveIntent, mergeSources, type SourceState } from './intent';

const s = (p: Partial<SourceState>): SourceState => ({ ...EMPTY_SOURCE, ...p });

describe('input intent', () => {
  it('merges: strongest move wins, booleans OR', () => {
    const m = mergeSources([s({ moveX: 0.3, run: true }), s({ moveX: -1, moveY: 0 }), s({ action: true })]);
    expect(m.moveX).toBe(-1);
    expect(m.run).toBe(true);
    expect(m.action).toBe(true);
    expect(m.sneak).toBe(false);
  });

  it('clamps diagonal keyboard input to unit length', () => {
    const i = deriveIntent(s({ moveX: 1, moveY: 1 }), EMPTY_SOURCE);
    expect(Math.hypot(i.moveX, i.moveY)).toBeCloseTo(1);
    expect(i.moveMagnitude).toBeCloseTo(1);
    const j = deriveIntent(s({ moveX: 0.5, moveY: 0 }), EMPTY_SOURCE);
    expect(j.moveMagnitude).toBeCloseTo(0.5);
  });

  it('detects action/pause edges', () => {
    const down = deriveIntent(s({ action: true, pause: true }), EMPTY_SOURCE);
    expect(down.actionPressed).toBe(true);
    expect(down.pausePressed).toBe(true);
    const held = deriveIntent(s({ action: true, pause: true }), s({ action: true, pause: true }));
    expect(held.actionPressed).toBe(false);
    expect(held.actionReleased).toBe(false);
    const up = deriveIntent(EMPTY_SOURCE, s({ action: true }));
    expect(up.actionReleased).toBe(true);
  });

  it('fart is a tap: pressed on the down edge only', () => {
    expect(deriveIntent(s({ fart: true }), EMPTY_SOURCE).fartPressed).toBe(true);
    expect(deriveIntent(s({ fart: true }), s({ fart: true })).fartPressed).toBe(false);
    expect(mergeSources([s({}), s({ fart: true })]).fart).toBe(true);
  });
});
