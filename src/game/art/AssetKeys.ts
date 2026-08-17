/** Texture keys. Entities/systems reference these, never raw strings, so art can be swapped in one place. */
export const TEX = {
  TILESET: 'tiles',
  PLAYER: 'player',
  POOP: 'poop',
  STINK: 'stink',
  PUFF: 'puff',
  SPOT_HIDDEN: 'spot-hidden',
  SPOT_EXPOSED: 'spot-exposed',
  SPOT_PIN: 'spot-pin',
  SPOT_DONE: 'spot-done',
  EXIT: 'exit',
  JOYSTICK_BASE: 'ui-joystick-base',
  JOYSTICK_THUMB: 'ui-joystick-thumb',
  BUTTON: 'ui-button',
  // Menu dressing (see generate.ts → generateMenuArt)
  MENU_BACKDROP: 'menu-backdrop',
  MENU_PATTERN: 'menu-pattern',
  MENU_FOOTPRINT: 'menu-footprint',
  MENU_FOOT: 'menu-foot',
  MENU_FOOT_SMEARED: 'menu-foot-smeared',
  MENU_POOP: 'menu-poop',
  MENU_JOSHAU: 'menu-joshau',
} as const;
export type TextureKey = (typeof TEX)[keyof typeof TEX];

/** Texture key of a level's painted ground backdrop (see art/ground.ts). */
export const groundTexture = (levelId: string): string => `ground-${levelId}`;
/** Texture key for an enemy archetype's sprite strip. */
export const enemyTexture = (kind: string): string => `enemy-${kind}`;
/** Animation key for a character strip's walk cycle. */
export const walkAnim = (textureKey: string): string => `${textureKey}:walk`;

/** Character sprites are drawn at 2× and displayed at this scale. */
export const CHARACTER_SCALE = 0.5;

/** Spot/exit marker textures are drawn at 2× (one marker = one grid tile); tileSprites need this tile scale. */
export const SPOT_TEXTURE_SIZE = 64;
/** Objective pin (bobs above required spots) and the "done" badge that replaces it. */
export const SPOT_PIN_W = 40;
export const SPOT_PIN_H = 52;
export const SPOT_DONE_SIZE = 36;

/** Source sizes of the menu textures (the scenes scale them). */
export const MENU_ART = {
  BACKDROP_W: 320,
  BACKDROP_H: 180,
  PATTERN: 192,
  FOOTPRINT_W: 64,
  FOOTPRINT_H: 80,
  FOOT_W: 160,
  FOOT_H: 220,
  POOP: 256,
  JOSHAU_W: 200,
  JOSHAU_H: 150,
  /** Y (in JOSHAU_H px) of the edge Joshau grips; everything below it sits off-screen when he peeks. */
  JOSHAU_EDGE: 124,
} as const;

/** Name of the tileset inside the (blank/procedural) tilemap. Must match what LevelLoader passes to addTilesetImage. */
export const TILESET_NAME = 'placeholder';
