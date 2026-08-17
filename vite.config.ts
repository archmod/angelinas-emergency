import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// VITE_BASE is set by the GitHub Pages workflow to "/<repo-name>/".
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered manually in src/platform/pwa.ts
      includeAssets: ['icons/*.png'],
      manifest: {
        id: base,
        name: "Angelina's Emergency",
        short_name: 'Angelina',
        description: 'A sneaky top-down stealth game. Angelina has to poop (and fart) a lot, and nobody can ever know - least of all her boyfriend Joshau, who is always trying to catch her in the act.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#1b1b24',
        theme_color: '#1b1b24',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,tmj,m4a,ogg,mp3,webmanifest}'],
        // Dev-only on-device console; don't make every player download it.
        globIgnores: ['**/eruda-*.js', '**/*.map'],
        // The Phaser chunk is > 2 MiB (Workbox default limit).
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
      },
      devOptions: { enabled: false },
    }),
  ],
});
