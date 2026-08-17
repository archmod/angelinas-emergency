/** Texture keys. Entities/systems reference these, never raw strings, so art can be swapped in one place. */
export const TEX = {
  TILESET: 'tiles',
  PLAYER: 'player',
  ENEMY: 'enemy',
  POOP: 'poop',
  SPOT_HIDDEN: 'spot-hidden',
  SPOT_EXPOSED: 'spot-exposed',
  EXIT: 'exit',
  JOYSTICK_BASE: 'ui-joystick-base',
  JOYSTICK_THUMB: 'ui-joystick-thumb',
  BUTTON: 'ui-button',
} as const;
export type TextureKey = (typeof TEX)[keyof typeof TEX];

/** Name of the tileset inside the (blank/procedural) tilemap. Must match what LevelLoader passes to addTilesetImage. */
export const TILESET_NAME = 'placeholder';
