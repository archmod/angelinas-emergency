/** Data-driven enemy archetypes. Colors are placeholder tints. Units: px, seconds, degrees. */
export interface EnemyDef {
  kind: string;
  label: string;
  color: number;
  /** Patrol / investigate speed. */
  speed: number;
  chaseSpeed: number;
  fovDeg: number;
  viewDistance: number;
  /** Inside this radius the player is spotted regardless of facing (and even hidden inside half of it). */
  proximityRadius: number;
  hearingRadius: number;
  /** Awareness gained per second while seeing the player at point-blank range in the open. */
  awarenessGain: number;
  /** Awareness gained per unit of heard loudness (instant). */
  noiseGain: number;
  /** Awareness lost per second with no stimulus. */
  awarenessDecay: number;
  turnRateDeg: number;
  waitAtWaypoint: number;
  investigateSeconds: number;
  loseSightSeconds: number;
  searchSeconds: number;
  catchRadius: number;
  /** Cameras/stationary watchers raise the alarm but cannot chase. */
  canChase: boolean;
}

const base: Omit<EnemyDef, 'kind' | 'label' | 'color'> = {
  speed: 90,
  chaseSpeed: 200,
  fovDeg: 80,
  viewDistance: 260,
  proximityRadius: 40,
  hearingRadius: 150,
  awarenessGain: 80,
  noiseGain: 45,
  awarenessDecay: 25,
  turnRateDeg: 240,
  waitAtWaypoint: 1.2,
  investigateSeconds: 1.6,
  loseSightSeconds: 2.0,
  searchSeconds: 8,
  catchRadius: 22,
  canChase: true,
};

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  ranger: { ...base, kind: 'ranger', label: 'Park Ranger', color: 0x3d8b37 },
  jogger: { ...base, kind: 'jogger', label: 'Jogger', color: 0xff8c42, speed: 170, chaseSpeed: 260, fovDeg: 60, viewDistance: 200, waitAtWaypoint: 0 },
  dog: {
    ...base,
    kind: 'dog',
    label: 'Dog',
    color: 0xc9a066,
    speed: 110,
    chaseSpeed: 280,
    fovDeg: 50,
    viewDistance: 110,
    hearingRadius: 320,
    noiseGain: 70,
    catchRadius: 20,
  },
  benchLady: {
    ...base,
    kind: 'benchLady',
    label: 'Bench Lady',
    color: 0xb87fd9,
    speed: 60,
    chaseSpeed: 120,
    fovDeg: 100,
    viewDistance: 300,
    turnRateDeg: 90,
  },
  camera: {
    ...base,
    kind: 'camera',
    label: 'Security Camera',
    color: 0x9aa4b2,
    speed: 0,
    chaseSpeed: 0,
    fovDeg: 45,
    viewDistance: 320,
    hearingRadius: 0,
    proximityRadius: 0,
    turnRateDeg: 40,
    canChase: false,
  },
};

export function getEnemyDef(kind: string): EnemyDef {
  const def = ENEMY_DEFS[kind];
  if (!def) throw new Error(`Unknown enemy kind '${kind}'`);
  return def;
}
