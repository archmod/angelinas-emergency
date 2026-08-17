import { TILE_DEFS, TILE_KIND_COUNT, TILE_SIZE, TileKind } from '@/config/tiles';
import { circle, ellipse, line, rng, roundRect, shade, tint, type Ctx } from './canvas';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Draws the whole tileset strip (one 32×32 cell per TileKind, in index order). */
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
    ctx.fillStyle = base;
    ctx.fillRect(x0, 0, T, T);
    const rand = rng(kind + 7);
    switch (kind) {
      case TileKind.GRASS: {
        for (let i = 0; i < 26; i++) {
          const x = x0 + rand() * T;
          const y = rand() * T;
          const h = 3 + rand() * 4;
          line(ctx, x, y + h, x + (rand() - 0.5) * 2, y, tint(base, rand() < 0.5 ? 1.25 : 0.8), 1.2, 'round');
        }
        break;
      }
      case TileKind.PATH: {
        for (let i = 0; i < 40; i++) circle(ctx, x0 + rand() * T, rand() * T, 0.7, tint(base, rand() < 0.5 ? 0.85 : 1.12));
        for (let i = 0; i < 4; i++) {
          const x = x0 + 4 + rand() * (T - 8);
          const y = 4 + rand() * (T - 8);
          const r = 1.5 + rand() * 2;
          circle(ctx, x + 0.8, y + 0.8, r, tint(base, 0.7));
          circle(ctx, x, y, r, tint(base, 1.15));
        }
        break;
      }
      case TileKind.FLOOR: {
        ctx.fillStyle = tint(base, 1.04);
        ctx.fillRect(x0, 0, T / 2, T / 2);
        ctx.fillRect(x0 + T / 2, T / 2, T / 2, T / 2);
        ctx.strokeStyle = tint(base, 0.86);
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, 0.5, T - 1, T - 1);
        line(ctx, x0 + T / 2, 0, x0 + T / 2, T, tint(base, 0.9), 1, 'butt');
        line(ctx, x0, T / 2, x0 + T, T / 2, tint(base, 0.9), 1, 'butt');
        break;
      }
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
        ctx.fillStyle = tint(hex(TILE_DEFS[TileKind.GRASS].color), 0.9);
        ctx.fillRect(x0, 0, T, T);
        for (const px of [3, 12, 21]) {
          roundRect(ctx, x0 + px, 2, 8, T - 4, 2, shade(ctx, x0 + px + 4, 16, 16, tint(base, 1.2), base), { stroke: tint(base, 0.55), lineWidth: 1 });
          line(ctx, x0 + px + 4, 6, x0 + px + 4, T - 6, tint(base, 0.8), 1, 'butt');
        }
        roundRect(ctx, x0, 9, T, 4, 1, tint(base, 0.85), { stroke: tint(base, 0.5), lineWidth: 1 });
        roundRect(ctx, x0, 20, T, 4, 1, tint(base, 0.85), { stroke: tint(base, 0.5), lineWidth: 1 });
        break;
      }
      case TileKind.BUSH: {
        ctx.fillStyle = hex(TILE_DEFS[TileKind.GRASS].color);
        ctx.fillRect(x0, 0, T, T);
        ellipse(ctx, x0 + 17, 19, 14, 11, 'rgba(0,0,0,0.2)');
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
      case TileKind.WATER: {
        const g = ctx.createLinearGradient(x0, 0, x0 + T, T);
        g.addColorStop(0, tint(base, 1.15));
        g.addColorStop(1, tint(base, 0.85));
        ctx.fillStyle = g;
        ctx.fillRect(x0, 0, T, T);
        ctx.strokeStyle = tint(base, 1.5);
        ctx.lineWidth = 1.5;
        for (const [wx, wy] of [
          [4, 9],
          [16, 21],
          [20, 6],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(x0 + wx, wy);
          ctx.quadraticCurveTo(x0 + wx + 4, wy - 3, x0 + wx + 8, wy);
          ctx.quadraticCurveTo(x0 + wx + 12, wy + 3, x0 + wx + 16, wy);
          ctx.stroke();
        }
        break;
      }
      case TileKind.TREE: {
        ctx.fillStyle = hex(TILE_DEFS[TileKind.GRASS].color);
        ctx.fillRect(x0, 0, T, T);
        ellipse(ctx, x0 + 18, 19, 14, 12, 'rgba(0,0,0,0.25)');
        circle(ctx, x0 + 16, 16, 5, '#5a3a22');
        circle(ctx, x0 + 15, 15, 14.5, shade(ctx, x0 + 15, 15, 14.5, tint(base, 1.7), tint(base, 0.9)), { stroke: tint(base, 0.55), lineWidth: 1.5 });
        for (let i = 0; i < 7; i++) circle(ctx, x0 + 6 + rand() * 18, 6 + rand() * 18, 1.5, tint(base, 2.1));
        break;
      }
      case TileKind.LOCKER: {
        ctx.fillStyle = hex(TILE_DEFS[TileKind.FLOOR].color);
        ctx.fillRect(x0, 0, T, T);
        roundRect(ctx, x0 + 3, 1, T - 6, T - 2, 2, shade(ctx, x0 + 16, 16, 20, tint(base, 1.35), base), { stroke: tint(base, 0.5), lineWidth: 1.5 });
        for (const vy of [7, 10, 13]) line(ctx, x0 + 9, vy, x0 + 23, vy, tint(base, 0.6), 1.5, 'butt');
        roundRect(ctx, x0 + 20, 20, 3, 6, 1, tint(base, 0.5));
        break;
      }
    }
    ctx.restore();
  }
}
