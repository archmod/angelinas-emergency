/** Logical (design) resolution. The canvas is scaled with Phaser.Scale.FIT to the device. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Scene keys — use these instead of string literals. */
export const SCENES = {
  BOOT: 'Boot',
  PRELOAD: 'Preload',
  MAIN_MENU: 'MainMenu',
  LEVEL_SELECT: 'LevelSelect',
  GAME: 'Game',
  HUD: 'Hud',
  PAUSE: 'Pause',
  RESULT: 'Result',
} as const;
export type SceneKey = (typeof SCENES)[keyof typeof SCENES];

/** Render depths (higher draws on top). */
export const DEPTH = {
  GROUND: 0,
  DECOR: 10,
  SPOTS: 20,
  CONES: 25,
  ENEMIES: 30,
  PLAYER: 40,
  OVERHEAD: 50,
  FX: 60,
  UI: 90,
  DEBUG: 100,
} as const;

/** Registry keys shared across scenes via this.registry. */
export const REGISTRY = {
  DEBUG_FLAGS: 'debugFlags',
  ART_MODE: 'artMode',
} as const;

export const APP_VERSION: string = __APP_VERSION__;
