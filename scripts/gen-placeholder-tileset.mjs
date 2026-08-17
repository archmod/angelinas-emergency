// Writes the placeholder tileset PNG + a Tiled tileset (.tsj) so Tiled can author maps before real art exists.
// Tile order/colors mirror src/config/tiles.ts (kept in sync by hand — the runtime generates its own textures).
// Usage: node scripts/gen-placeholder-tileset.mjs
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = 32;
const TILES = [
  { name: 'grass', color: 0x566d3e, collides: false, occludes: false, hides: false },
  { name: 'path', color: 0x8c8266, collides: false, occludes: false, hides: false },
  { name: 'floor', color: 0xa29a87, collides: false, occludes: false, hides: false },
  { name: 'wall', color: 0x4b4f5c, collides: true, occludes: true, hides: false },
  { name: 'fence', color: 0x8b6b3d, collides: true, occludes: false, hides: false },
  { name: 'bush', color: 0x2f6b39, collides: false, occludes: true, hides: true },
  { name: 'water', color: 0x34576a, collides: true, occludes: false, hides: false },
  { name: 'tree', color: 0x245c2c, collides: true, occludes: true, hides: false },
  { name: 'locker', color: 0x6b7a8f, collides: false, occludes: true, hides: true },
];

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'assets', 'tiles');
mkdirSync(outDir, { recursive: true });

const png = new PNG({ width: TILES.length * T, height: T });
TILES.forEach((tile, i) => {
  const r = (tile.color >> 16) & 255;
  const g = (tile.color >> 8) & 255;
  const b = tile.color & 255;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const border = x === 0 || y === 0 || x === T - 1 || y === T - 1;
      const f = border ? 0.75 : 1;
      const idx = (y * png.width + i * T + x) * 4;
      png.data[idx] = r * f;
      png.data[idx + 1] = g * f;
      png.data[idx + 2] = b * f;
      png.data[idx + 3] = 255;
    }
  }
});
writeFileSync(join(outDir, 'placeholder-tiles.png'), PNG.sync.write(png));

const tsj = {
  type: 'tileset',
  version: '1.10',
  name: 'placeholder',
  image: 'placeholder-tiles.png',
  imagewidth: TILES.length * T,
  imageheight: T,
  tilewidth: T,
  tileheight: T,
  tilecount: TILES.length,
  columns: TILES.length,
  margin: 0,
  spacing: 0,
  tiles: TILES.map((t, id) => ({
    id,
    class: t.name,
    properties: [
      { name: 'collides', type: 'bool', value: t.collides },
      { name: 'occludes', type: 'bool', value: t.occludes },
      { name: 'hides', type: 'bool', value: t.hides },
    ],
  })),
};
writeFileSync(join(outDir, 'placeholder-tiles.tsj'), JSON.stringify(tsj, null, 2));
console.log('wrote public/assets/tiles/placeholder-tiles.{png,tsj}');
