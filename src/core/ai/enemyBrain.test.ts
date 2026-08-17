import { describe, expect, it } from 'vitest';
import { ENEMY_DEFS, type EnemyDef } from '@/config/enemies';
import { dist, norm, sub, type Vec2 } from '@/core/math/vec';
import { AWARENESS, createBrainState, stepBrain, type BrainCommand, type BrainConfig, type BrainState, type Perception } from './enemyBrain';

/** Minimal fake engine: moves the enemy toward its target at the requested speed and reports arrival. */
function makeSim(cfg: BrainConfig) {
  let state = createBrainState(cfg);
  let pos = { ...cfg.homePos };
  let facing = cfg.homeFacingRad;
  let target: Vec2 | null = null;
  let run = false;
  const log: BrainCommand[] = [];
  const modes: string[] = [state.mode];
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const step = (dt: number, world: { playerPos: Vec2; playerHidden?: boolean; sees?: boolean; factor?: number; heard?: { pos: Vec2; level: number } | null; stanceMul?: number }) => {
    // engine movement
    if (target) {
      const speed = run ? cfg.def.chaseSpeed : cfg.def.speed;
      const d = dist(pos, target);
      if (d <= Math.max(4, speed * dt)) {
        pos = { ...target };
        target = null;
      } else {
        const dir = norm(sub(target, pos));
        pos = { x: pos.x + dir.x * speed * dt, y: pos.y + dir.y * speed * dt };
      }
    }
    const perception: Perception = {
      selfPos: pos,
      selfFacingRad: facing,
      seesPlayer: world.sees ?? false,
      visionFactor: world.factor ?? (world.sees ? 1 : 0),
      playerPos: world.playerPos,
      distToPlayer: dist(pos, world.playerPos),
      playerStanceMul: world.stanceMul ?? 1,
      heard: world.heard ?? null,
      arrived: target === null,
      rand,
    };
    const out = stepBrain(state, perception, dt, cfg);
    state = out.state;
    for (const c of out.commands) {
      log.push(c);
      if (c.type === 'moveTo') {
        target = { ...c.target };
        run = c.run;
      } else if (c.type === 'wander') {
        target = { x: c.center.x + (rand() - 0.5) * 64, y: c.center.y + (rand() - 0.5) * 64 };
        run = c.run;
      } else if (c.type === 'stop') {
        target = null;
      } else if (c.type === 'face') {
        facing = c.angleRad;
      } else if (c.type === 'modeChanged') {
        modes.push(c.to);
      }
    }
  };
  const runFor = (seconds: number, world: Parameters<typeof step>[1], dt = 1 / 30) => {
    for (let t = 0; t < seconds; t += dt) step(dt, world);
  };
  return {
    step,
    runFor,
    get state(): BrainState {
      return state;
    },
    get pos() {
      return pos;
    },
    get modes() {
      return modes;
    },
    get log() {
      return log;
    },
  };
}

const ranger: EnemyDef = ENEMY_DEFS.ranger!;
const A = { x: 100, y: 100 };
const B = { x: 400, y: 100 };
const FAR = { x: 2000, y: 2000 };
const patrolCfg = (def: EnemyDef = ranger, extra: Partial<BrainConfig> = {}): BrainConfig => ({
  def,
  patrol: [A, B],
  patrolMode: 'loop',
  homePos: A,
  homeFacingRad: 0,
  ...extra,
});

describe('enemyBrain', () => {
  it('patrols between waypoints, waiting at each', () => {
    const sim = makeSim(patrolCfg());
    sim.runFor(0.5, { playerPos: FAR });
    // still waiting at A (waitAtWaypoint 1.2s), no move issued to B yet
    expect(sim.state.mode).toBe('patrol');
    sim.runFor(1.5, { playerPos: FAR });
    expect(sim.state.patrolIndex).toBe(1);
    expect(sim.pos.x).toBeGreaterThan(A.x + 10);
    // travel 300px at 90px/s ≈ 3.3s, then wait, then head back
    sim.runFor(5.5, { playerPos: FAR });
    expect(sim.state.patrolIndex).toBe(0);
    expect(sim.state.mode).toBe('patrol');
    expect(sim.state.awareness).toBe(0);
  });

  it('pingpong patrol reverses at the ends', () => {
    const C = { x: 700, y: 100 };
    const sim = makeSim(patrolCfg(ranger, { patrol: [A, B, C], patrolMode: 'pingpong' }));
    const seen: number[] = [];
    for (let i = 0; i < 30 * 30; i++) {
      sim.step(1 / 30, { playerPos: FAR });
      if (seen[seen.length - 1] !== sim.state.patrolIndex) seen.push(sim.state.patrolIndex);
    }
    expect(seen.slice(0, 5)).toEqual([0, 1, 2, 1, 0]);
  });

  it('escalates patrol → suspicious → chase (with a shout) when it keeps seeing the player', () => {
    const sim = makeSim(patrolCfg());
    const player = { x: 250, y: 100 };
    sim.runFor(0.7, { playerPos: player, sees: true, factor: 0.8 });
    expect(sim.state.mode).toBe('suspicious'); // 80*0.8=64/s → 35 in ~0.55s
    expect(sim.state.lastKnown).toEqual(player);
    sim.runFor(1.5, { playerPos: player, sees: true, factor: 0.8 });
    expect(sim.state.mode).toBe('chase');
    expect(sim.modes).toEqual(['patrol', 'suspicious', 'chase']);
    expect(sim.log.some((c) => c.type === 'shout')).toBe(true);
    // chase moves toward the player at run speed
    const moves = sim.log.filter((c): c is Extract<BrainCommand, { type: 'moveTo' }> => c.type === 'moveTo' && c.run);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[moves.length - 1]!.target).toEqual(player);
  });

  it('catches the player when close enough during a chase, exactly once', () => {
    const sim = makeSim(patrolCfg());
    const player = { x: 140, y: 100 };
    sim.runFor(3, { playerPos: player, sees: true, factor: 1 });
    const caught = sim.log.filter((c) => c.type === 'caught');
    expect(caught).toHaveLength(1);
    expect(sim.state.caught).toBe(true);
  });

  it('loses the player → searches around the last known position → returns to patrol', () => {
    const sim = makeSim(patrolCfg());
    const player = { x: 260, y: 100 };
    sim.runFor(2, { playerPos: player, sees: true, factor: 1 }); // becomes chase quickly, may catch? distance 160 → not caught within 2s? 200px/s → catches. Use hidden far player instead.
    expect(['chase', 'search']).toContain(sim.state.mode);
    // now the player vanished (behind a wall / in a bush)
    sim.runFor(ranger.loseSightSeconds + 0.5, { playerPos: FAR, sees: false });
    expect(sim.state.mode).toBe('search');
    expect(sim.state.awareness).toBeGreaterThanOrEqual(AWARENESS.SEARCH_FLOOR);
    sim.runFor(ranger.searchSeconds + 1, { playerPos: FAR, sees: false });
    expect(['return', 'patrol']).toContain(sim.state.mode); // may already be back if the route is short
    sim.runFor(8, { playerPos: FAR, sees: false });
    expect(sim.state.mode).toBe('patrol');
    expect(sim.state.awareness).toBeLessThan(AWARENESS.SUSPICIOUS);
    expect(sim.modes).toEqual(['patrol', 'suspicious', 'chase', 'search', 'return', 'patrol']);
  });

  it('a loud noise makes it suspicious and investigate the noise position', () => {
    const sim = makeSim(patrolCfg());
    const noiseAt = { x: 100, y: 300 };
    sim.step(1 / 30, { playerPos: FAR, heard: { pos: noiseAt, level: 1 } }); // 45 awareness
    expect(sim.state.mode).toBe('suspicious');
    expect(sim.state.lastKnown).toEqual(noiseAt);
    sim.runFor(1, { playerPos: FAR });
    // after the 0.6s turn phase it walks toward the noise
    expect(sim.log.some((c) => c.type === 'moveTo' && c.target.x === noiseAt.x && c.target.y === noiseAt.y)).toBe(true);
    sim.runFor(6, { playerPos: FAR });
    expect(sim.state.mode).toBe('patrol');
  });

  it('a quiet noise only nudges awareness and decays back to calm', () => {
    const sim = makeSim(patrolCfg());
    sim.step(1 / 30, { playerPos: FAR, heard: { pos: B, level: 0.3 } }); // 13.5
    expect(sim.state.mode).toBe('patrol');
    expect(sim.state.awareness).toBeGreaterThan(0);
    sim.runFor(1, { playerPos: FAR });
    expect(sim.state.awareness).toBe(0);
  });

  it('bumping into a hidden player at point-blank range is an instant alert', () => {
    const sim = makeSim(patrolCfg());
    sim.step(1 / 30, { playerPos: { x: 110, y: 100 }, sees: true, factor: 1 }); // within proximityRadius (40)
    expect(sim.state.awareness).toBe(AWARENESS.MAX);
    expect(sim.state.mode).toBe('chase');
  });

  it('alarm-only enemies (camera) shout but never chase', () => {
    const cam = ENEMY_DEFS.camera!;
    const sim = makeSim({ def: cam, patrol: [], patrolMode: 'stationary', homePos: A, homeFacingRad: 0 });
    sim.runFor(3, { playerPos: { x: 200, y: 100 }, sees: true, factor: 1 });
    expect(sim.state.mode).toBe('suspicious');
    expect(sim.modes).not.toContain('chase');
    const shouts = sim.log.filter((c) => c.type === 'shout');
    expect(shouts.length).toBeGreaterThanOrEqual(1);
    expect(shouts.length).toBeLessThanOrEqual(2); // cooldown 2.5s over 3s
    // no chase movement
    expect(sim.log.some((c) => c.type === 'moveTo' && c.run)).toBe(false);
  });

  it('stationary enemies sweep their facing between scan angles', () => {
    const sim = makeSim({ def: ranger, patrol: [], patrolMode: 'stationary', homePos: A, homeFacingRad: 0, scanRad: [0, Math.PI] });
    const angles = new Set<number>();
    for (let i = 0; i < 90; i++) {
      sim.step(1 / 30, { playerPos: FAR });
      const last = [...sim.log].reverse().find((c) => c.type === 'face');
      if (last && last.type === 'face') angles.add(Math.round(last.angleRad * 10) / 10);
    }
    expect(angles.size).toBeGreaterThan(5);
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(-0.01);
      expect(a).toBeLessThanOrEqual(Math.PI + 0.01);
    }
  });
});
