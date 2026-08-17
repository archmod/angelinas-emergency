# Angelina's Emergency — project notes for Claude Code

2D top-down stealth game for the browser (desktop + iOS Safari). Angelina must sneak to a poop spot and
finish without being detected; enemies patrol with vision cones and give chase. Worlds: park, neighborhood, school.
Full design/milestone plan: `~/.claude/plans/wise-dancing-walrus.md` (M0 scaffold → M6 ship).

## Stack
- **Phaser 4.2.x** (pinned; NOT Phaser 3) + TypeScript 5.9 + Vite 7, Arcade physics, WebGL.
- Vitest for `src/core/**` (pure logic), Playwright smoke tests in `e2e/` (Chromium; WebKit opt-in with `PW_WEBKIT=1`).
- PWA via `vite-plugin-pwa`; deployed to GitHub Pages by `.github/workflows/deploy.yml` (`VITE_BASE=/<repo>/`).

## Commands
- `npm run dev` — Vite dev server on LAN (`--host`); open `http://<lan-ip>:5173` on the phone. Add `?debug=1` for the eruda on-device console.
- `npm test` / `npm run test:watch` — Vitest (core logic). `npm run test:e2e` — Playwright boot smoke test.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run preview`.
- `npm run gen:icons` — regenerate placeholder PWA icons (`scripts/gen-icons.mjs`, pngjs).

## Architecture rules
- `src/core/**` is **Phaser-free** (enforced by ESLint `no-restricted-imports`): level schema/loaders, grid raycast/A*,
  detection (vision/awareness/noise), enemy FSM, rules (poop/urgency/objectives/score), input intent. All unit-tested.
- `src/game/**` is the Phaser side: scenes, entities, systems, input sources, art registry, UI, debug.
- Scene keys/depths/registry keys live in `src/config/constants.ts`; ALL gameplay tunables go in `src/config/balance.ts`.
- Logical resolution 1280×720, `Scale.FIT` + `CENTER_BOTH`, landscape only (DOM rotate overlay in portrait).
- Entities reference art only through `src/game/art/AssetRegistry.ts` ids so placeholder shapes can be swapped for sprites.
- Levels: internal `LevelData` schema; authored as ASCII (`src/levels/ascii/*.ts`); Tiled `.tmj` loader is optional (M4).

## Phaser 4 specifics (differences from v3 that matter here)
- API docs shipped in the package: `node_modules/phaser/skills/<topic>/SKILL.md` (e.g. `physics-arcade`, `tilemaps`,
  `input-keyboard-mouse-touch`, `scale-and-responsive`, `graphics-and-shapes`, `v3-to-v4-migration`). Read the relevant one before using an unfamiliar API.
- WebGL is primary (Canvas deprecated). Masks/FX are unified as *filters* (`BitmapMask` gone). `Geom.Point` removed → `Vector2`.
  `setTintFill` → `setTintMode`. `DynamicTexture`/`RenderTexture` need an explicit `render()`. `roundPixels` defaults to `false`. `Math.TAU` = 2π.
- Avoid v4-only features (filters, lighting, TilemapGPULayer) unless needed, so a fallback to 3.90 stays cheap.

## iOS testing notes
- No Safari Web Inspector on Linux → use `?debug=1` (eruda) and the in-game debug overlay; Playwright WebKit needs `sudo apt-get install libavif16`.
- Guards for scroll/zoom live in `src/styles.css` + `src/platform/ios.ts`; audio must start after a user gesture (menu "tap to start").
- HTTPS-only features (service worker, wake lock) are verified on the deployed GitHub Pages URL.
