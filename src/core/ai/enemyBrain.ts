import type { EnemyDef } from '@/config/enemies';
import type { PatrolMode } from '@/core/level/schema';
import { angleTo, clamp, degToRad, dist, type Vec2 } from '@/core/math/vec';

/**
 * Pure enemy AI. `stepBrain` takes the previous state + what the enemy perceives this tick and
 * returns the next state plus commands for the engine side to execute (move, face, shout, caught).
 * No engine types, no side effects → fully unit-testable with scripted perception timelines.
 */

export type BrainMode = 'patrol' | 'suspicious' | 'chase' | 'search' | 'return';

export const AWARENESS = {
  MAX: 100,
  SUSPICIOUS: 35,
  ALERT: 100,
  CALM: 10,
  SEARCH_FLOOR: 60,
} as const;

export interface BrainConfig {
  def: EnemyDef;
  patrol: Vec2[];
  patrolMode: PatrolMode;
  homePos: Vec2;
  homeFacingRad: number;
  /** Stationary sweep bounds (radians). */
  scanRad?: [number, number];
}

export interface BrainState {
  mode: BrainMode;
  awareness: number;
  lastKnown: Vec2 | null;
  /** Seconds in the current phase. */
  timer: number;
  /** Sub-phase inside the mode. */
  phase: number;
  patrolIndex: number;
  patrolDir: 1 | -1;
  timeSinceSeen: number;
  wandersLeft: number;
  /** Where the engine was last told to go. */
  target: Vec2 | null;
  moving: boolean;
  /** Facing base for look-around sweeps. */
  sweepBase: number;
  /** Total time spent in the current mode. */
  modeTime: number;
  caught: boolean;
  /** Seconds until this enemy may shout again (alarm-only enemies repeat while they see you). */
  shoutCooldown: number;
}

export interface Perception {
  selfPos: Vec2;
  selfFacingRad: number;
  seesPlayer: boolean;
  visionFactor: number;
  playerPos: Vec2;
  distToPlayer: number;
  /** Awareness multiplier for the player's stance: sneak 0.6, walk 1, run 1.5. */
  playerStanceMul: number;
  /** Strongest noise heard this tick (already filtered by hearing range). */
  heard: { pos: Vec2; level: number } | null;
  /** Engine says: reached the last requested target (or had nowhere to go). */
  arrived: boolean;
  /** Deterministic RNG in [0,1). */
  rand: () => number;
}

export type BrainCommand =
  | { type: 'moveTo'; target: Vec2; run: boolean }
  | { type: 'wander'; center: Vec2; radius: number; run: boolean }
  | { type: 'face'; angleRad: number }
  | { type: 'stop' }
  | { type: 'shout'; pos: Vec2 }
  | { type: 'caught' }
  | { type: 'modeChanged'; from: BrainMode; to: BrainMode };

export function createBrainState(cfg: BrainConfig): BrainState {
  return {
    mode: 'patrol',
    awareness: 0,
    lastKnown: null,
    timer: 0,
    phase: 0,
    patrolIndex: 0,
    patrolDir: 1,
    timeSinceSeen: Infinity,
    wandersLeft: 0,
    target: null,
    moving: false,
    sweepBase: cfg.homeFacingRad,
    modeTime: 0,
    caught: false,
    shoutCooldown: 0,
  };
}

const LOOK_SWEEP_RAD = degToRad(70);
const LOOK_SWEEP_SPEED = 2.2; // rad/s of the sine phase
const CHASE_RETARGET_SECONDS = 0.3;
const CHASE_RETARGET_DIST = 24;
const SEARCH_WANDERS = 3;
const SEARCH_WANDER_RADIUS_TILES = 4;
const SUSPICIOUS_TURN_SECONDS = 0.6;
const SHOUT_COOLDOWN_SECONDS = 2.5;

export function stepBrain(prev: BrainState, p: Perception, dt: number, cfg: BrainConfig): { state: BrainState; commands: BrainCommand[] } {
  const s: BrainState = { ...prev };
  const cmds: BrainCommand[] = [];
  const def = cfg.def;
  s.timer += dt;
  s.modeTime += dt;
  s.shoutCooldown = Math.max(0, s.shoutCooldown - dt);

  // ---- 1. Awareness -------------------------------------------------------------------------
  let stimulus = false;
  if (p.seesPlayer) {
    const alertMul = s.mode === 'patrol' || s.mode === 'return' ? 1 : 2.5;
    s.awareness += def.awarenessGain * p.visionFactor * p.playerStanceMul * alertMul * dt;
    if (def.proximityRadius > 0 && p.distToPlayer <= def.proximityRadius) s.awareness = AWARENESS.MAX;
    s.lastKnown = { ...p.playerPos };
    s.timeSinceSeen = 0;
    stimulus = true;
  } else {
    s.timeSinceSeen += dt;
  }
  if (p.heard && !p.seesPlayer) {
    s.awareness += p.heard.level * def.noiseGain;
    // A noise tells you where to look, unless you already have eyes on the player.
    if (s.mode !== 'chase') s.lastKnown = { ...p.heard.pos };
    stimulus = true;
  }
  if (!stimulus && s.mode !== 'chase') s.awareness -= def.awarenessDecay * dt;
  if (s.mode === 'suspicious' && s.phase < 2) s.awareness = Math.max(s.awareness, AWARENESS.SUSPICIOUS);
  if (s.mode === 'search') s.awareness = Math.max(s.awareness, AWARENESS.SEARCH_FLOOR);
  s.awareness = clamp(s.awareness, 0, AWARENESS.MAX);

  // ---- 2. Transitions -----------------------------------------------------------------------
  const setMode = (to: BrainMode) => {
    cmds.push({ type: 'modeChanged', from: s.mode, to });
    cmds.push({ type: 'stop' });
    s.mode = to;
    s.timer = 0;
    s.phase = 0;
    s.modeTime = 0;
    s.moving = false;
    s.target = null;
  };
  const shout = () => {
    if (s.shoutCooldown > 0) return;
    s.shoutCooldown = SHOUT_COOLDOWN_SECONDS;
    cmds.push({ type: 'shout', pos: { ...p.selfPos } });
  };

  if (s.mode !== 'chase' && s.awareness >= AWARENESS.ALERT && s.lastKnown) {
    if (def.canChase) {
      setMode('chase');
      shout();
    } else {
      // Alarm-only enemies (cameras) raise the alarm and stay agitated while they see you.
      if (s.mode !== 'suspicious') setMode('suspicious');
      shout();
    }
  } else if ((s.mode === 'patrol' || s.mode === 'return') && s.awareness >= AWARENESS.SUSPICIOUS && s.lastKnown) {
    setMode('suspicious');
  } else if (s.mode === 'chase') {
    if (!s.caught && p.distToPlayer <= def.catchRadius) {
      s.caught = true;
      cmds.push({ type: 'caught' });
    } else if (!p.seesPlayer && s.timeSinceSeen > def.loseSightSeconds) {
      setMode('search');
      s.wandersLeft = SEARCH_WANDERS;
    }
  } else if (s.mode === 'search') {
    if (p.seesPlayer && def.canChase) {
      s.awareness = AWARENESS.MAX;
      setMode('chase');
    } else if (s.modeTime > def.searchSeconds) {
      s.awareness = Math.min(s.awareness, AWARENESS.CALM);
      setMode('return');
    }
  }

  // ---- 3. Behaviour -------------------------------------------------------------------------
  const moveTo = (target: Vec2, run: boolean) => {
    s.target = { ...target };
    s.moving = true;
    cmds.push({ type: 'moveTo', target: { ...target }, run });
  };
  const arrivedNow = s.moving && p.arrived;
  if (arrivedNow) s.moving = false;
  const lookAround = () => {
    cmds.push({ type: 'face', angleRad: s.sweepBase + Math.sin(s.timer * LOOK_SWEEP_SPEED) * LOOK_SWEEP_RAD });
  };

  switch (s.mode) {
    case 'patrol': {
      const stationary = cfg.patrolMode === 'stationary' || cfg.patrol.length === 0;
      if (stationary) {
        if (cfg.scanRad) {
          const [a, b] = cfg.scanRad;
          const t = (Math.sin(s.modeTime * (degToRad(def.turnRateDeg) / Math.max(0.01, Math.abs(b - a)))) + 1) / 2;
          cmds.push({ type: 'face', angleRad: a + (b - a) * t });
        } else {
          cmds.push({ type: 'face', angleRad: cfg.homeFacingRad });
        }
        break;
      }
      if (s.phase === 0) {
        // heading to waypoint
        if (!s.moving) {
          if (arrivedNow || s.target === null) {
            if (s.target !== null) {
              // reached a waypoint → wait
              s.phase = 1;
              s.timer = 0;
              s.sweepBase = p.selfFacingRad;
              cmds.push({ type: 'stop' });
              break;
            }
            moveTo(cfg.patrol[s.patrolIndex]!, false);
          }
        }
      } else {
        // waiting at waypoint
        if (def.waitAtWaypoint > 0.3) lookAround();
        if (s.timer >= def.waitAtWaypoint) {
          advancePatrol(s, cfg);
          s.phase = 0;
          moveTo(cfg.patrol[s.patrolIndex]!, false);
        }
      }
      break;
    }

    case 'suspicious': {
      const lk = s.lastKnown ?? p.selfPos;
      if (s.phase === 0) {
        // Turn toward the disturbance (movement was stopped on entering the mode).
        cmds.push({ type: 'face', angleRad: angleTo(p.selfPos, lk) });
        if (s.timer >= SUSPICIOUS_TURN_SECONDS) {
          s.phase = 1;
          s.timer = 0;
          if (def.canChase && def.speed > 0) moveTo(lk, false);
          else {
            s.phase = 2;
            s.sweepBase = angleTo(p.selfPos, lk);
          }
        }
      } else if (s.phase === 1) {
        // Walk to the last known position (re-target if new info arrived).
        if (s.target && dist(s.target, lk) > CHASE_RETARGET_DIST) moveTo(lk, false);
        if (!s.moving) {
          s.phase = 2;
          s.timer = 0;
          s.sweepBase = p.selfFacingRad;
        }
      } else {
        lookAround();
        if (s.timer >= def.investigateSeconds) {
          setMode('return');
        }
      }
      break;
    }

    case 'chase': {
      if (s.caught) {
        cmds.push({ type: 'stop' });
        break;
      }
      const goal = p.seesPlayer ? p.playerPos : (s.lastKnown ?? p.playerPos);
      const stale = s.target === null || dist(s.target, goal) > CHASE_RETARGET_DIST || s.timer >= CHASE_RETARGET_SECONDS;
      if (stale) {
        s.timer = 0;
        moveTo(goal, true);
      }
      break;
    }

    case 'search': {
      const lk = s.lastKnown ?? p.selfPos;
      if (s.phase === 0) {
        if (s.target === null) moveTo(lk, true);
        if (arrivedNow) {
          s.phase = 1;
          s.timer = 0;
          s.sweepBase = p.selfFacingRad;
        }
      } else if (s.phase === 1) {
        lookAround();
        if (s.timer >= def.investigateSeconds) {
          if (s.wandersLeft > 0) {
            s.wandersLeft -= 1;
            s.phase = 2;
            s.timer = 0;
            s.moving = true;
            s.target = { ...lk };
            cmds.push({ type: 'wander', center: { ...lk }, radius: SEARCH_WANDER_RADIUS_TILES, run: false });
          } else {
            s.awareness = Math.min(s.awareness, AWARENESS.CALM);
            setMode('return');
          }
        }
      } else {
        if (arrivedNow) {
          s.phase = 1;
          s.timer = 0;
          s.sweepBase = p.selfFacingRad;
        }
      }
      break;
    }

    case 'return': {
      if (s.target === null) {
        const { index, point } = nearestPatrolPoint(cfg, p.selfPos);
        s.patrolIndex = index;
        moveTo(point, false);
      } else if (arrivedNow) {
        setMode('patrol');
        s.timer = def.waitAtWaypoint; // don't dawdle: pick up the route right away
        s.phase = 1;
        s.target = { ...p.selfPos };
        s.sweepBase = cfg.homeFacingRad;
      }
      break;
    }
  }

  return { state: s, commands: cmds };
}

function advancePatrol(s: BrainState, cfg: BrainConfig): void {
  const n = cfg.patrol.length;
  if (n <= 1) return;
  if (cfg.patrolMode === 'pingpong') {
    let next = s.patrolIndex + s.patrolDir;
    if (next >= n || next < 0) {
      s.patrolDir = s.patrolDir === 1 ? -1 : 1;
      next = s.patrolIndex + s.patrolDir;
    }
    s.patrolIndex = next;
  } else {
    s.patrolIndex = (s.patrolIndex + 1) % n;
  }
}

function nearestPatrolPoint(cfg: BrainConfig, from: Vec2): { index: number; point: Vec2 } {
  if (cfg.patrol.length === 0) return { index: 0, point: cfg.homePos };
  let best = 0;
  let bestD = Infinity;
  cfg.patrol.forEach((pt, i) => {
    const d = dist(pt, from);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return { index: best, point: cfg.patrol[best]! };
}
