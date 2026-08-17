/**
 * Painted ground, Binding-of-Isaac style: instead of crisp per-tile art, each level gets one big hand-painted-looking
 * backdrop. Seamless "material" textures (muted, mottled, grainy) are laid down through repeat patterns so there are no
 * tile seams, borders between materials get organic bumps, water gets a shaded shore + foam rim, and walls cast soft
 * ambient-occlusion shadows onto the floor. Everything is deterministic (seeded) so a level always looks the same.
 */
import { TILE_DEFS, TileFlag, TileKind, type TileKindId } from '@/config/tiles';
import type { LevelData } from '@/core/level/schema';
import { rng, type Ctx } from './canvas';

/** Ground materials that get a painted texture. */
export type Material = 'grass' | 'path' | 'floor' | 'water';
export const MATERIALS: readonly Material[] = ['grass', 'path', 'floor', 'water'];

/** Muted, desaturated palettes — the flat placeholder colors were far too saturated to read as painted. */
interface Palette {
  base: string;
  dark: string;
  light: string;
  /** Extra "grunge" tint for stains / worn spots. */
  stain: string;
  /** Per-pixel grain amplitude (0-255). */
  grain: number;
}
const PALETTE: Record<Material, Palette> = {
  grass: { base: '#566d3e', dark: '#42562f', light: '#6c8449', stain: '#5f5b38', grain: 7 },
  path: { base: '#8c8266', dark: '#6b624b', light: '#a59a7d', stain: '#5e5541', grain: 8 },
  floor: { base: '#a29a87', dark: '#847c6b', light: '#b9b09c', stain: '#6f6552', grain: 4 },
  water: { base: '#34576a', dark: '#284452', light: '#4a7386', stain: '#223b47', grain: 3 },
};

/** Size of one seamless material texture (px). 12 tiles — big enough that repeats don't jump out. */
export const MATERIAL_SIZE = 384;

const TILE_MATERIAL: Partial<Record<TileKindId, Material>> = {
  [TileKind.GRASS]: 'grass',
  [TileKind.PATH]: 'path',
  [TileKind.FLOOR]: 'floor',
  [TileKind.WATER]: 'water',
};

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex: string, a: number): string => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** Soft round blob: solid at the centre fading to fully transparent at the rim. */
function softBlob(ctx: Ctx, x: number, y: number, r: number, hex: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, alpha));
  g.addColorStop(0.55, rgba(hex, alpha * 0.55));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Irregular blotch: a small cluster of overlapping soft blobs. */
function blotch(ctx: Ctx, rand: () => number, x: number, y: number, r: number, hex: string, alpha: number): void {
  const n = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * r * 0.6;
    softBlob(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.5 + rand() * 0.6), hex, alpha);
  }
}

/** Short soft brush stroke. */
function stroke(ctx: Ctx, x: number, y: number, len: number, angle: number, width: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - (Math.cos(angle) * len) / 2, y - (Math.sin(angle) * len) / 2);
  ctx.lineTo(x + (Math.cos(angle) * len) / 2, y + (Math.sin(angle) * len) / 2);
  ctx.stroke();
}

/** Uniform per-pixel grain (seamless by construction). */
function grain(ctx: Ctx, size: number, amp: number, rand: () => number): void {
  if (amp <= 0) return;
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() * 2 - 1) * amp;
    d[i] = Math.max(0, Math.min(255, d[i]! + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Draws a seamless material texture into a square canvas of `size` px. Every feature is stamped at the 3×3 wrapped
 * offsets so the texture tiles without visible seams.
 */
export function drawMaterial(ctx: Ctx, mat: Material, size: number, seed: number): void {
  const S = size;
  const p = PALETTE[mat];
  const rand = rng(seed);
  const wrap = (x: number, y: number, draw: (px: number, py: number) => void) => {
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) draw(x + dx, y + dy);
  };
  const area = (S * S) / (256 * 256); // feature counts are tuned for a 256² texture

  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, S, S);

  // 1. Large, faint mottling — the "hand-painted, unevenly lit" base.
  for (let i = 0; i < 14 * area; i++) {
    const hex = rand() < 0.5 ? p.dark : p.light;
    wrap(rand() * S, rand() * S, (x, y) => softBlob(ctx, x, y, 50 + rand() * 70, hex, 0.1 + rand() * 0.09));
  }
  // 2. Medium irregular blotches.
  for (let i = 0; i < 26 * area; i++) {
    const roll = rand();
    const hex = roll < 0.45 ? p.dark : roll < 0.85 ? p.light : p.stain;
    const r = 12 + rand() * 20;
    const a = 0.1 + rand() * 0.12;
    // Save the sequence so all 9 wrapped copies are identical.
    const state = rand();
    wrap(rand() * S, rand() * S, (x, y) => blotch(ctx, rng(Math.floor(state * 1e9)), x, y, r, hex, a));
  }
  // 3. Painterly strokes with a dominant direction.
  const dir = mat === 'grass' ? -0.25 : 0;
  for (let i = 0; i < 40 * area; i++) {
    const hex = rand() < 0.5 ? p.dark : p.light;
    const angle = dir + (rand() - 0.5) * (mat === 'water' ? 0.15 : 0.7);
    const len = 14 + rand() * 24;
    const w = 4 + rand() * 5;
    const a = 0.05 + rand() * 0.05;
    wrap(rand() * S, rand() * S, (x, y) => stroke(ctx, x, y, len, angle, w, rgba(hex, a)));
  }

  // 4. Material-specific details, sparse and low-contrast.
  switch (mat) {
    case 'grass': {
      // Worn dirt patches.
      for (let i = 0; i < 4 * area; i++) {
        const state = rand();
        const r = 18 + rand() * 14;
        wrap(rand() * S, rand() * S, (x, y) => blotch(ctx, rng(Math.floor(state * 1e9)), x, y, r, p.stain, 0.16));
      }
      // Tufts: 2-3 short curved blades, dark with a light edge.
      for (let i = 0; i < 22 * area; i++) {
        const blades = 2 + Math.floor(rand() * 2);
        const spec = Array.from({ length: blades }, () => ({ dx: (rand() - 0.5) * 6, h: 4 + rand() * 4, lean: (rand() - 0.5) * 3 }));
        const light = rand() < 0.5;
        wrap(rand() * S, rand() * S, (x, y) => {
          for (const b of spec) {
            ctx.strokeStyle = rgba(light ? p.light : p.dark, 0.5);
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + b.dx, y + 2);
            ctx.quadraticCurveTo(x + b.dx + b.lean * 0.3, y - b.h * 0.5, x + b.dx + b.lean, y - b.h);
            ctx.stroke();
          }
        });
      }
      // Tiny clover-ish specks.
      for (let i = 0; i < 40 * area; i++) {
        const light = rand() < 0.6;
        const r = 0.9 + rand() * 0.6;
        wrap(rand() * S, rand() * S, (x, y) => {
          ctx.fillStyle = rgba(light ? p.light : p.dark, 0.35);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      break;
    }
    case 'path': {
      // Pebbles with a soft shadow and a tiny highlight.
      for (let i = 0; i < 30 * area; i++) {
        const rx = 1.5 + rand() * 2.2;
        const ry = rx * (0.6 + rand() * 0.4);
        const rot = rand() * Math.PI;
        wrap(rand() * S, rand() * S, (x, y) => {
          ctx.fillStyle = rgba(p.dark, 0.45);
          ctx.beginPath();
          ctx.ellipse(x + 0.7, y + 0.9, rx, ry, rot, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba(p.light, 0.75);
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      // Fine gravel.
      for (let i = 0; i < 90 * area; i++) {
        const light = rand() < 0.5;
        const r = 0.7 + rand() * 0.5;
        wrap(rand() * S, rand() * S, (x, y) => {
          ctx.fillStyle = rgba(light ? p.light : p.dark, 0.3);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      // Cracks: thin wobbly dark polylines.
      for (let i = 0; i < 5 * area; i++) {
        const segs = 3 + Math.floor(rand() * 4);
        const pts: [number, number][] = [];
        let a = rand() * Math.PI * 2;
        let px = 0;
        let py = 0;
        for (let s = 0; s < segs; s++) {
          pts.push([px, py]);
          a += (rand() - 0.5) * 1.2;
          const l = 5 + rand() * 9;
          px += Math.cos(a) * l;
          py += Math.sin(a) * l;
        }
        pts.push([px, py]);
        wrap(rand() * S, rand() * S, (x, y) => {
          ctx.strokeStyle = rgba(p.stain, 0.35);
          ctx.lineWidth = 1;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          pts.forEach(([qx, qy], k) => (k === 0 ? ctx.moveTo(x + qx, y + qy) : ctx.lineTo(x + qx, y + qy)));
          ctx.stroke();
        });
      }
      break;
    }
    case 'floor': {
      // Worn tile grid every 32 px (aligned with the world grid) — broken, uneven lines.
      const T = 32;
      for (let gx = 0; gx < S; gx += T) {
        for (let seg = 0; seg < S; seg += 8) {
          if (rand() < 0.15) continue;
          ctx.strokeStyle = rgba(p.dark, 0.25 + rand() * 0.3);
          ctx.lineWidth = 1 + rand() * 0.6;
          ctx.beginPath();
          ctx.moveTo(gx + 0.5, seg);
          ctx.lineTo(gx + 0.5, seg + 8);
          ctx.stroke();
        }
      }
      for (let gy = 0; gy < S; gy += T) {
        for (let seg = 0; seg < S; seg += 8) {
          if (rand() < 0.15) continue;
          ctx.strokeStyle = rgba(p.dark, 0.25 + rand() * 0.3);
          ctx.lineWidth = 1 + rand() * 0.6;
          ctx.beginPath();
          ctx.moveTo(seg, gy + 0.5);
          ctx.lineTo(seg + 8, gy + 0.5);
          ctx.stroke();
        }
      }
      // Scuffs and stains.
      for (let i = 0; i < 18 * area; i++) {
        const angle = (rand() - 0.5) * 0.8;
        const len = 8 + rand() * 16;
        wrap(rand() * S, rand() * S, (x, y) => stroke(ctx, x, y, len, angle, 1.2, rgba(p.stain, 0.22)));
      }
      for (let i = 0; i < 6 * area; i++) {
        const state = rand();
        const r = 10 + rand() * 12;
        wrap(rand() * S, rand() * S, (x, y) => blotch(ctx, rng(Math.floor(state * 1e9)), x, y, r, p.stain, 0.14));
      }
      break;
    }
    case 'water': {
      // Deep spots.
      for (let i = 0; i < 6 * area; i++) {
        const state = rand();
        const r = 20 + rand() * 20;
        wrap(rand() * S, rand() * S, (x, y) => blotch(ctx, rng(Math.floor(state * 1e9)), x, y, r, p.stain, 0.18));
      }
      // Soft, elongated light patches (reflections / caustics).
      for (let i = 0; i < 26 * area; i++) {
        const rx = 8 + rand() * 16;
        const ry = rx * (0.3 + rand() * 0.25);
        const a = 0.1 + rand() * 0.1;
        wrap(rand() * S, rand() * S, (x, y) => {
          const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
          g.addColorStop(0, rgba(p.light, a));
          g.addColorStop(1, rgba(p.light, 0));
          ctx.fillStyle = g;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(1, ry / rx);
          ctx.beginPath();
          ctx.arc(0, 0, rx, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }
      // Faint ripple arcs.
      for (let i = 0; i < 12 * area; i++) {
        const rx = 6 + rand() * 10;
        const from = Math.PI * (0.9 + rand() * 0.3);
        const to = from + Math.PI * (0.5 + rand() * 0.4);
        wrap(rand() * S, rand() * S, (x, y) => {
          ctx.strokeStyle = rgba(p.light, 0.22);
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.ellipse(x, y, rx, rx * 0.35, 0, from, to);
          ctx.stroke();
        });
      }
      break;
    }
  }

  // 5. Fine grain over everything.
  grain(ctx, S, p.grain, rand);
}

let materialCache: Record<Material, HTMLCanvasElement> | null = null;

/** The seamless material canvases (built once, lazily). */
export function getMaterialCanvases(): Record<Material, HTMLCanvasElement> {
  if (materialCache) return materialCache;
  const out = {} as Record<Material, HTMLCanvasElement>;
  MATERIALS.forEach((mat, i) => {
    const c = document.createElement('canvas');
    c.width = MATERIAL_SIZE;
    c.height = MATERIAL_SIZE;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    drawMaterial(ctx, mat, MATERIAL_SIZE, 101 + i * 37);
    out[mat] = c;
  });
  materialCache = out;
  return out;
}

/** Look of the per-level paint job (px are world px). */
export const GROUND_LOOK = {
  /** Radius range of the brush dabs that make material borders organic. */
  BUMP_MIN: 2.5,
  BUMP_MAX: 10,
  /** Max dabs per shared tile edge (some edges get none). */
  BUMPS_PER_EDGE: 3,
  /** Wall ambient occlusion: blur radius and darkness. */
  AO_BLUR: 16,
  AO_ALPHA: 0.62,
  /** Fences/trees cast a lighter shadow than walls. */
  AO_MINOR_SCALE: 0.45,
  /** Water shore: dark depth band + light foam rim. */
  SHORE_BLUR: 11,
  SHORE_ALPHA: 0.55,
  FOAM_BLUR: 2.5,
  FOAM_ALPHA: 0.55,
  FOAM_COLOR: '#c9e6ea',
  /** Level-wide vignette darkness at the far corners. */
  VIGNETTE: 0.32,
  /** Big soft per-level blobs that break up texture repetition. */
  VARIATION_BLOBS: 10,
} as const;

const materialAt = (data: LevelData, i: number): Material | null => {
  const wall = data.walls[i] ?? -1;
  if (wall === TileKind.WATER) return 'water';
  const g = data.ground[i] ?? -1;
  return g >= 0 ? (TILE_MATERIAL[g as TileKindId] ?? null) : null;
};

const isSolidWall = (idx: number): boolean => idx >= 0 && (TILE_DEFS[idx as TileKindId]?.flags & TileFlag.SOLID) !== 0 && idx !== TileKind.WATER;

function offscreen(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

/**
 * Paints a level's ground into `ctx` (a canvas of `pxW`×`pxH`, which is the world size × `scale`).
 * Layers, bottom to top: material fills → border bumps → water (masked, with shore shading) → wall AO → vignette.
 */
export function paintLevelGround(ctx: Ctx, data: LevelData, pxW: number, pxH: number, scale = 1): void {
  const { width: W, height: H, tileSize: T } = data;
  const L = GROUND_LOOK;
  const mats = getMaterialCanvases();
  const rand = rng(hashString(data.meta.id));
  const patterns = {} as Record<Material, CanvasPattern>;
  for (const m of MATERIALS) {
    const p = ctx.createPattern(mats[m], 'repeat');
    if (!p) throw new Error('createPattern failed');
    patterns[m] = p;
  }
  const matAt = (x: number, y: number): Material | null => (x < 0 || y < 0 || x >= W || y >= H ? null : materialAt(data, y * W + x));

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W * T, H * T);

  // 1. Land materials as solid cell fills through their repeat pattern (pattern space == world space → seamless).
  for (const m of ['grass', 'path', 'floor'] as const) {
    ctx.fillStyle = patterns[m];
    ctx.beginPath();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (matAt(x, y) === m) ctx.rect(x * T, y * T, T, T);
    ctx.fill();
  }

  // 2. Water mask (white = water). Border bumps go in here too so the shore is organic.
  const [waterMaskC, waterMask] = offscreen(pxW, pxH);
  waterMask.setTransform(scale, 0, 0, scale, 0, 0);
  waterMask.fillStyle = '#fff';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (matAt(x, y) === 'water') waterMask.fillRect(x * T, y * T, T, T);

  // 3. Bumps along every edge shared by two different materials. Each bump is a brush-dab ellipse straddling the
  //    edge, painted with one side's pattern (seamless, since patterns are anchored to world space) so it eats into
  //    the other side. Count, size, stretch and protrusion all vary so the border reads hand-painted, not scalloped.
  const dab = (cx: number, cy: number, rx: number, ry: number, rot: number, m: Material) => {
    const target = m === 'water' ? waterMask : ctx;
    if (m !== 'water') ctx.fillStyle = patterns[m];
    target.beginPath();
    target.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    target.fill();
    if (m !== 'water') {
      // Land eats into water: erase from the water mask.
      waterMask.globalCompositeOperation = 'destination-out';
      waterMask.beginPath();
      waterMask.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      waterMask.fill();
      waterMask.globalCompositeOperation = 'source-over';
    }
  };
  // Edge from (x1,y1) to (x2,y2); (nx,ny) is the unit normal pointing from material a's cell into b's.
  const edge = (a: Material, b: Material, x1: number, y1: number, x2: number, y2: number, nx: number, ny: number) => {
    const n = rand() < 0.15 ? 0 : 1 + Math.floor(rand() * L.BUMPS_PER_EDGE);
    const along = Math.atan2(y2 - y1, x2 - x1);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.15 + rand() * 0.7) / n;
      const r = L.BUMP_MIN + rand() * rand() * (L.BUMP_MAX - L.BUMP_MIN); // skewed toward small dabs
      const stretch = 1 + rand() * 1.2;
      const m = rand() < 0.5 ? a : b;
      // Push the dab toward the side it eats into (deeper bite) or back toward its own side (flatter bump).
      const push = (rand() * 0.9 - 0.45) * r * (m === a ? 1 : -1);
      dab(x1 + (x2 - x1) * t + nx * push, y1 + (y2 - y1) * t + ny * push, r * stretch, r, along, m);
    }
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const m = matAt(x, y);
      if (!m) continue;
      const right = matAt(x + 1, y);
      if (right && right !== m) edge(m, right, (x + 1) * T, y * T, (x + 1) * T, (y + 1) * T, 1, 0);
      const down = matAt(x, y + 1);
      if (down && down !== m) edge(m, down, x * T, (y + 1) * T, (x + 1) * T, (y + 1) * T, 0, 1);
    }
  }

  // 4. Water: pattern through the mask, then shore shading (dark depth band + light foam) as inner shadows.
  const [waterC, water] = offscreen(pxW, pxH);
  water.drawImage(waterMaskC, 0, 0);
  water.globalCompositeOperation = 'source-in';
  water.setTransform(scale, 0, 0, scale, 0, 0);
  water.fillStyle = patterns.water;
  water.fillRect(0, 0, W * T, H * T);
  water.setTransform(1, 0, 0, 1, 0, 0);
  water.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(waterC, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  {
    // Land mask = inverse of the water mask; its shadow, kept only inside water, is the shore.
    const [landC, land] = offscreen(pxW, pxH);
    land.fillStyle = '#fff';
    land.fillRect(0, 0, pxW, pxH);
    land.globalCompositeOperation = 'destination-out';
    land.drawImage(waterMaskC, 0, 0);
    const [shoreC, shore] = offscreen(pxW, pxH);
    const inner = (color: string, blur: number) => {
      shore.shadowColor = color;
      shore.shadowBlur = blur * scale;
      shore.shadowOffsetX = 0;
      shore.shadowOffsetY = 0;
      shore.drawImage(landC, 0, 0);
    };
    inner(`rgba(0,0,0,${L.SHORE_ALPHA})`, L.SHORE_BLUR);
    inner(rgba(L.FOAM_COLOR, L.FOAM_ALPHA), L.FOAM_BLUR);
    shore.shadowColor = 'transparent';
    shore.globalCompositeOperation = 'destination-in';
    shore.drawImage(waterMaskC, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(shoreC, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  // 5. Big faint per-level blobs so the material repeat never lines up visibly.
  for (let i = 0; i < L.VARIATION_BLOBS; i++) {
    const hex = rand() < 0.5 ? '#000000' : '#ffffff';
    softBlob(ctx, rand() * W * T, rand() * H * T, 90 + rand() * 160, hex, 0.04 + rand() * 0.04);
  }

  // 6. Wall ambient occlusion: blurred wall silhouette minus the walls themselves (fences/trees cast a lighter one).
  {
    const [wallC, wall] = offscreen(pxW, pxH);
    const [minorC, minor] = offscreen(pxW, pxH);
    wall.setTransform(scale, 0, 0, scale, 0, 0);
    minor.setTransform(scale, 0, 0, scale, 0, 0);
    wall.fillStyle = '#fff';
    minor.fillStyle = '#fff';
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const w = data.walls[y * W + x] ?? -1;
        if (!isSolidWall(w)) continue;
        (w === TileKind.WALL ? wall : minor).fillRect(x * T, y * T, T, T);
      }
    }
    const [aoC, ao] = offscreen(pxW, pxH);
    ao.shadowColor = `rgba(0,0,0,${L.AO_ALPHA})`;
    ao.shadowBlur = L.AO_BLUR * scale;
    ao.drawImage(wallC, 0, 0);
    ao.globalAlpha = L.AO_MINOR_SCALE;
    ao.drawImage(minorC, 0, 0);
    ao.globalAlpha = 1;
    ao.shadowColor = 'transparent';
    ao.globalCompositeOperation = 'destination-out';
    ao.drawImage(wallC, 0, 0);
    ao.drawImage(minorC, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(aoC, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  // 7. Level-wide vignette (Isaac rooms are darkest at the walls).
  {
    const cx = (W * T) / 2;
    const cy = (H * T) / 2;
    const rMax = Math.hypot(cx, cy);
    const g = ctx.createRadialGradient(cx, cy, rMax * 0.35, cx, cy, rMax);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${L.VIGNETTE})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W * T, H * T);
  }

  ctx.restore();
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
