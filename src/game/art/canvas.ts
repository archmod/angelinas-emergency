/** Small Canvas-2D drawing helpers used by the sprite generators. */
export type Ctx = CanvasRenderingContext2D;

export interface StrokeOpts {
  stroke?: string;
  lineWidth?: number;
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient, opts: StrokeOpts = {}): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (opts.stroke) {
    ctx.lineWidth = opts.lineWidth ?? 2;
    ctx.strokeStyle = opts.stroke;
    ctx.stroke();
  }
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, opts: StrokeOpts & { rotation?: number } = {}): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, opts.rotation ?? 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (opts.stroke) {
    ctx.lineWidth = opts.lineWidth ?? 2;
    ctx.strokeStyle = opts.stroke;
    ctx.stroke();
  }
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, opts: StrokeOpts = {}): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (opts.stroke) {
    ctx.lineWidth = opts.lineWidth ?? 2;
    ctx.strokeStyle = opts.stroke;
    ctx.stroke();
  }
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, stroke: string, lineWidth = 2, cap: CanvasLineCap = 'round'): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = cap;
  ctx.stroke();
}

export function arc(ctx: Ctx, x: number, y: number, r: number, from: number, to: number, stroke: string, lineWidth = 2): void {
  ctx.beginPath();
  ctx.arc(x, y, r, from, to);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Radial gradient with a light spot offset toward the top-left (cartoon shading). */
export function shade(ctx: Ctx, x: number, y: number, r: number, light: string, dark: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}

/** Deterministic pseudo-random in [0,1) — same art every run/test. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Lighten/darken a hex color by factor (>1 lighter, <1 darker). */
export function tint(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
