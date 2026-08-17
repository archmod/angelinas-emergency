/**
 * Shared UI look. Keep every color/font here so the whole UI can be restyled in one place.
 * Palette: chocolate browns (poop) + cream text + frog green (Angelina's feet) + Angelina pink as the accent.
 */
export const THEME = {
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  colors: {
    bg: 0x2b1a10, // dark chocolate
    bgHex: '#2b1a10',
    panel: 0x3d2716, // milk-chocolate panels/cards
    panelHex: '#3d2716',
    text: '#fff1d6', // cream
    textDim: '#c9a980', // tan
    accent: '#ff7ab6', // Angelina pink
    accentHex: 0xff7ab6,
    poop: 0xa0673a, // poop brown (secondary buttons, card borders)
    poopHex: '#a0673a',
    poopDark: 0x3f2412, // outline brown
    poopDarkHex: '#3f2412',
    frog: 0x7ed957, // frog-skin green (primary buttons)
    frogHex: '#7ed957',
    danger: '#ff5a5a',
    ok: '#7ee787',
    warn: '#ffd166',
  },
  /** Button fills. Buttons pick a light/dark label color automatically from the fill's luminance. */
  button: {
    primary: 0x7ed957, // frog green — the "go" action
    poop: 0xa0673a, // secondary
    muted: 0x5a4030, // tertiary / toggles
    warn: 0xffd166,
  },
} as const;

export const textStyle = (
  size: number,
  color: string = THEME.colors.text,
  extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: THEME.font,
  fontSize: `${size}px`,
  color,
  ...extra,
});

/** Chunky cartoon heading: cream fill, thick brown outline, hard drop shadow. */
export const headingStyle = (size: number, color: string = THEME.colors.text): Phaser.Types.GameObjects.Text.TextStyle =>
  textStyle(size, color, {
    fontStyle: 'bold',
    stroke: THEME.colors.poopDarkHex,
    strokeThickness: Math.max(4, Math.round(size * 0.14)),
    shadow: { offsetX: 0, offsetY: Math.max(2, Math.round(size * 0.07)), color: 'rgba(0,0,0,0.45)', blur: 0, fill: true, stroke: true },
  });
