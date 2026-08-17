# Angelina's Emergency

A 2D top-down stealth game for the browser — desktop and iPhone (Safari). Angelina urgently needs to poop; sneak to a spot,
do the deed, and don't get caught by the park ranger, the nosy neighbors, or the hall monitor.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173 (also served on your LAN IP for phone testing)
npm test             # unit tests (Vitest)
npm run test:e2e     # browser smoke tests (Playwright)
npm run build && npm run preview
```

Open `?debug=1` for an on-device console (eruda) and debug overlays.

## Deploy

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Stack

Phaser 4 · TypeScript · Vite · Vitest · Playwright · vite-plugin-pwa
