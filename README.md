# Angelina's Emergency

A 2D top-down stealth game for the browser — desktop and iPhone (Safari). Angelina has to poop (and fart) a lot, and nobody
can ever know — least of all Joshau, who is always trying to catch her in the act. Sneak to every pinned spot,
hold GO to let it out (one go per spot — twice in the same place would be too obvious), and don't get spotted by the
park ranger, the nosy neighbors, or the hall monitor. Un-pinned spots are optional relief when the meter gets scary.

**Play:** https://archmod.github.io/angelinas-emergency/ (on iPhone: Share → *Add to Home Screen* for fullscreen)

## Controls

| | Desktop | Touch |
|---|---|---|
| Move | WASD / arrows | left-thumb floating joystick (push gently to creep) |
| Run (fast, noisy) | Shift | RUN button |
| Sneak (slow, silent) | C | — |
| Poop / interact | hold Space or E | hold GO |
| Toot (let gas out early) | F | TOOT button |
| Pause | Esc / P | ⏸ button |

Enemies see in the yellow cones (walls and bushes block sight) and hear running footsteps, farts and… the deed itself.
Bushes, lockers and hidden spots hide you unless someone walks right into you. Watch the urgency meter — and the gas
meter under it: gas builds up (faster the more urgent she is) and when it fills she farts on her own, LOUD. Toot early
while nobody's near and it's barely a whisper; the cloud lingers, and anyone who walks through it gets suspicious.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173 (also served on your LAN IP for phone testing)
npm test             # unit tests (Vitest) — core logic + level validity
npm run test:e2e     # browser smoke tests (Playwright, Chromium; PW_WEBKIT=1 adds WebKit)
npm run build && npm run preview
```

Debug: append `?debug=1` (on-device eruda console + `` ` ``/F1 overlay, F2 hearing, F3 nav, F4 bodies, F6 god mode),
`?level=<id>` to jump to a level (ids: `park-01`, `park-02`, `neighborhood-01`, `neighborhood-02`, `school-01`, `school-02`, `test-01`).

## Levels

Levels are ASCII text in `src/levels/ascii/*.ts` (see the legend in `src/core/level/asciiLevel.ts`) and are validated by
`npm test` (rectangular, at least one required spot, every spot reachable, every patrol connected). Tiled `.tmj` maps are also supported
(`src/core/level/parseTiled.ts`; `npm run gen:tiles` writes a placeholder tileset for Tiled).

## Deploy

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Stack

Phaser 4 · TypeScript · Vite · Vitest · Playwright · vite-plugin-pwa · procedural WebAudio SFX
