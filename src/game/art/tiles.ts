import { TILE_DEFS, TILE_KIND_COUNT, TILE_SIZE, TileKind } from '@/config/tiles';
import { circle, ellipse, line, rng, roundRect, shade, tint, type Ctx } from './canvas';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Soft contact shadow (dark centre fading out) so object tiles sit on the painted ground without a hard-edged blob. */
const softShadow = (ctx: Ctx, x: number, y: number, r: number, alpha: number): CanvasGradient => {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  return g;
};

/**
 * Draws the whole tileset strip (one 32×32 cell per TileKind, in index order).
 * Ground kinds (grass/path/floor) and water are painted per level by art/ground.ts, so their cells here are only
 * flat swatches / transparent (water stays on the walls layer for collision). Object tiles have transparent
 * backgrounds so the painted ground shows through.
 */
export function drawTileset(ctx: Ctx): void {
  const T = TILE_SIZE;
  for (let kind = 0; kind < TILE_KIND_COUNT; kind++) {
    const def = TILE_DEFS[kind as keyof typeof TILE_DEFS];
    const x0 = kind * T;
    const base = hex(def.color);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, T, T);
    ctx.clip();
    const rand = rng(kind + 7);
    switch (kind) {
      case TileKind.GRASS:
      case TileKind.PATH:
      case TileKind.FLOOR: {
        ctx.fillStyle = base;
        ctx.fillRect(x0, 0, T, T);
        break;
      }
      case TileKind.WATER:
        break; // transparent: painted on the ground canvas
      case TileKind.WALL: {
        const mortar = tint(base, 0.6);
        ctx.fillStyle = mortar;
        ctx.fillRect(x0, 0, T, T);
        const brick = (bx: number, by: number, bw: number, bh: number) => {
          roundRect(ctx, x0 + bx + 1, by + 1, bw - 2, bh - 2, 1.5, tint(base, 0.98 + rand() * 0.14));
          line(ctx, x0 + bx + 2, by + 2, x0 + bx + bw - 3, by + 2, tint(base, 1.25), 1, 'butt');
        };
        brick(0, 0, 16, 8);
        brick(16, 0, 16, 8);
        brick(-8, 8, 16, 8);
        brick(8, 8, 16, 8);
        brick(24, 8, 16, 8);
        brick(0, 16, 16, 8);
        brick(16, 16, 16, 8);
        brick(-8, 24, 16, 8);
        brick(8, 24, 16, 8);
        brick(24, 24, 16, 8);
        break;
      }
      case TileKind.FENCE: {
        for (const px of [3, 12, 21]) {
          roundRect(ctx, x0 + px, 2, 8, T - 4, 2, shade(ctx, x0 + px + 4, 16, 16, tint(base, 1.2), base), { stroke: tint(base, 0.55), lineWidth: 1 });
          line(ctx, x0 + px + 4, 6, x0 + px + 4, T - 6, tint(base, 0.8), 1, 'butt');
        }
        roundRect(ctx, x0, 9, T, 4, 1, tint(base, 0.85), { stroke: tint(base, 0.5), lineWidth: 1 });
        roundRect(ctx, x0, 20, T, 4, 1, tint(base, 0.85), { stroke: tint(base, 0.5), lineWidth: 1 });
        break;
      }
      case TileKind.BUSH: {
        ellipse(ctx, x0 + 17, 20, 13, 10, softShadow(ctx, x0 + 17, 20, 13, 0.32));
        for (const [bx, by, r] of [
          [10, 13, 8.5],
          [22, 12, 8],
          [16, 21, 9],
          [8, 21, 6],
          [24, 21, 6],
        ] as const) {
          circle(ctx, x0 + bx, by, r, shade(ctx, x0 + bx, by, r, tint(base, 1.5), base), { stroke: tint(base, 0.6), lineWidth: 1.2 });
        }
        for (let i = 0; i < 6; i++) circle(ctx, x0 + 6 + rand() * 20, 8 + rand() * 18, 1.2, tint(base, 1.9));
        break;
      }
      case TileKind.TREE: {
        ellipse(ctx, x0 + 18, 20, 14, 12, softShadow(ctx, x0 + 18, 20, 14, 0.38));
        circle(ctx, x0 + 16, 16, 5, '#5a3a22');
        circle(ctx, x0 + 15, 15, 14.5, shade(ctx, x0 + 15, 15, 14.5, tint(base, 1.7), tint(base, 0.9)), { stroke: tint(base, 0.55), lineWidth: 1.5 });
        for (let i = 0; i < 7; i++) circle(ctx, x0 + 6 + rand() * 18, 6 + rand() * 18, 1.5, tint(base, 2.1));
        break;
      }
      case TileKind.LOCKER: {
        roundRect(ctx, x0 + 3, 1, T - 6, T - 2, 2, shade(ctx, x0 + 16, 16, 20, tint(base, 1.35), base), { stroke: tint(base, 0.5), lineWidth: 1.5 });
        for (const vy of [7, 10, 13]) line(ctx, x0 + 9, vy, x0 + 23, vy, tint(base, 0.6), 1.5, 'butt');
        roundRect(ctx, x0 + 20, 20, 3, 6, 1, tint(base, 0.5));
        break;
      }
    }
    ctx.restore();
  }
}
