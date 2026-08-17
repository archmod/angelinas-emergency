import { TileFlag } from '@/config/tiles';
import { Grid } from '@/core/grid/Grid';

/**
 * Builds a Grid from ASCII rows for tests: '#' = solid+occlude, '=' = solid only, 'B' = occlude+hide,
 * anything else = open. Tile size 32 unless given.
 */
export function gridFromAscii(rows: string[], tileSize = 32): Grid {
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const flags = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? ' ';
      let f = 0;
      if (ch === '#' || ch === ' ') f = TileFlag.SOLID | TileFlag.OCCLUDE;
      else if (ch === '=') f = TileFlag.SOLID;
      else if (ch === 'B') f = TileFlag.OCCLUDE | TileFlag.HIDE;
      flags[y * width + x] = f;
    }
  });
  return new Grid(width, height, tileSize, flags);
}

/** World-space center of a tile. */
export const center = (tx: number, ty: number, tileSize = 32) => ({ x: (tx + 0.5) * tileSize, y: (ty + 0.5) * tileSize });
