/** Shared UI look. Keep every color/font here so the placeholder look can be restyled in one place. */
export const THEME = {
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  colors: {
    bg: 0x1b1b24,
    bgHex: '#1b1b24',
    text: '#f4f1ea',
    textDim: '#a9a6a0',
    accent: '#ff7ab6', // Angelina pink
    accentHex: 0xff7ab6,
    poop: 0x7a4a1d,
    danger: '#ff5a5a',
    ok: '#7ee787',
    warn: '#ffd166',
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
