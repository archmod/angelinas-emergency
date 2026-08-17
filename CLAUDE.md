# Angelina's Emergency — project notes for Claude Code

2D top-down stealth game for the browser (desktop + iOS Safari). Premise: Angelina has to poop (and fart) a LOT and
nobody can ever know — least of all **Joshau** (spelled that way), who is always trying to catch her in
the act. She must sneak to a poop spot and finish without being detected; enemies patrol with vision cones and give
chase. Worlds: park, neighborhood, school. All player-facing copy should keep this voice (secretive, urgent, cheeky). Joshau is her boyfriend but that is only ever implied — never write "boyfriend" in player-facing text (menus, manifest, README).
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
- Entities reference art only through `src/game/art/AssetKeys.ts` ids so placeholder shapes can be swapped for sprites.
- Ground is painted, not tiled (Binding-of-Isaac style): `src/game/art/ground.ts` builds seamless muted material textures
  (grass/path/floor/water) once, then `LevelLoader.buildLevel` paints one backdrop canvas per level (`groundTexture(levelId)`):
  pattern fills → brush-dab borders between materials → masked water with shore shadow + foam rim → wall AO → vignette.
  Look tunables are `GROUND_LOOK`/`PALETTE` there. Water stays a *transparent* SOLID tile on the walls layer for collision;
  object tiles (fence/bush/tree/locker) have transparent backgrounds so the painted ground shows through.
- Levels: internal `LevelData` schema; authored as ASCII (`src/levels/ascii/*.ts`, registered in `src/levels/registry.ts`,
  validated by `src/levels/levels.test.ts`); Tiled `.tmj` loader in `src/core/level/parseTiled.ts` (register with `tiled(meta, url)`).
- Enemy archetypes are data in `src/config/enemies.ts`; the pure FSM is `src/core/ai/enemyBrain.ts` (commands applied by `src/game/entities/Enemy.ts`).
- Audio is procedural (`src/game/audio/AudioSystem.ts`, WebAudio patches) — no sound files. UI sounds via `Button`.
- Progress/settings persist through `src/game/systems/SaveManager.ts` (`src/core/rules/progress.ts` schema).

## Phaser 4 specifics (differences from v3 that matter here)
- API docs shipped in the package: `node_modules/phaser/skills/<topic>/SKILL.md` (e.g. `physics-arcade`, `tilemaps`,
  `input-keyboard-mouse-touch`, `scale-and-responsive`, `graphics-and-shapes`, `v3-to-v4-migration`). Read the relevant one before using an unfamiliar API.
- WebGL is primary (Canvas deprecated). Masks/FX are unified as *filters* (`BitmapMask` gone). `Geom.Point` removed → `Vector2`.
  `setTintFill` → `setTintMode`. `DynamicTexture`/`RenderTexture` need an explicit `render()`. `roundPixels` defaults to `false`. `Math.TAU` = 2π.
- Avoid v4-only features (filters, lighting, TilemapGPULayer) unless needed, so a fallback to 3.90 stays cheap.

## iOS testing notes
- No Safari Web Inspector on Linux → use `?debug=1` (eruda) and the in-game debug overlay; Playwright WebKit needs `libavif16`
  (`sudo apt-get install libavif16`, or without sudo: `apt-get download libavif16 libgav1-1 libyuv0`, `dpkg-deb -x` each, and copy the
  `.so*` files into `~/.cache/ms-playwright/webkit-*/minibrowser-{wpe,gtk}/sys/lib/`). Then `PW_WEBKIT=1 npm run test:e2e`.
- Phaser tests Container hit areas in origin-normalized space (adds `displayOriginX/Y` = w/2,h/2 after `setSize`): a Container's
  hit `Rectangle` must start at (0,0), not (-w/2,-h/2) — see `src/game/ui/Button.ts`. Verify tap targets with off-center taps, not center clicks.
- Guards for scroll/zoom live in `src/styles.css` + `src/platform/ios.ts`; audio must start after a user gesture (menu "tap to start").
- Canvas fitting is owned by `src/game/systems/ViewportFit.ts` (ResizeObserver on `#game` + re-checks after rotation). Never call
  `game.scale.refresh()` on its own — it reuses the *previous* parent measurement; use `refitCanvas(game)` (`getParentBounds()` first).
  The ScaleManager's own 500 ms parent poll stops while `game.pause()`d (rotate overlay). Safe-area insets are `#game`'s offsets,
  not padding (Phaser measures the border box). Home-screen (standalone) launches are always portrait → rotate → must re-fit.
- HTTPS-only features (service worker, wake lock) are verified on the deployed GitHub Pages URL.
- Headless Chromium renders WebGL with SwiftShader, which randomly drops wedges out of rotated/tweened sprites in
  screenshots (not a game bug). For visual checks use headed Chromium on the GPU:
  `chromium.launch({ headless: false, args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] })`.

## UI theme
- Menus are poop + feet themed: palette/`headingStyle` in `src/game/ui/theme.ts`, chunky pill `Button` (opt-in `toes: true`
  for the three-toed foot-pad look), `addMenuBackdrop()` (chocolate gradient + drifting poop/footprint pattern) for menu
  screens, and menu textures (`TEX.MENU_*`, generated in `generate.ts` → `generateMenuArt`).
