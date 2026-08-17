import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests. Runs the Vite dev server (fast, no build) and checks the game boots,
 * scenes transition, and no console errors are thrown. WebGL runs on SwiftShader in headless mode.
 *
 * WebKit (closest thing to iOS Safari on Linux) is opt-in: `PW_WEBKIT=1 npm run test:e2e`.
 * It needs `npx playwright install webkit` and the system package `libavif16` (sudo apt-get install libavif16).
 */
const phone = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 };

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone-landscape-chromium', use: { ...devices['Pixel 7'], ...phone } },
    ...(process.env.PW_WEBKIT
      ? [{ name: 'phone-landscape-webkit', use: { ...devices['iPhone 13'], ...phone } }]
      : []),
  ],
});
