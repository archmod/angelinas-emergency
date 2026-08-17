/** Texture keys. Entities/systems reference these, never raw strings, so art can be swapped in one place. */
export const TEX = {
  TILESET: 'tiles',
  PLAYER: 'player',
  POOP: 'poop',
  STINK: 'stink',
  SPOT_HIDDEN: 'spot-hidden',
  SPOT_EXPOSED: 'spot-exposed',
  EXIT: 'exit',
  JOYSTICK_BASE: 'ui-joystick-base',
  JOYSTICK_THUMB: 'ui-joystick-thumb',
  BUTTON: 'ui-button',
} as const;
export type TextureKey = (typeof TEX)[keyof typeof TEX];

/** Texture key for an enemy archetype's sprite strip. */
export const enemyTexture = (kind: string): string => `enemy-${kind}`;
/** Animation key for a character strip's walk cycle. */
export const walkAnim = (textureKey: string): string => `${textureKey}:walk`;

/** Character sprites are drawn at 2× and displayed at this scale. */
export const CHARACTER_SCALE = 0.5;

/** Spot/exit marker textures are drawn at 2× (one marker = one grid tile); tileSprites need this tile scale. */
export const SPOT_TEXTURE_SIZE = 64;

/** Name of the tileset inside the (blank/procedural) tilemap. Must match what LevelLoader passes to addTilesetImage. */
export const TILESET_NAME = 'placeholder';
