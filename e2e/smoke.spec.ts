import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __game?: { scene: { isActive(key: string): boolean }; renderer: { type: number }; isPaused: boolean };
  }
}

const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
};

const waitForScene = (page: Page, key: string) =>
  page.waitForFunction((k) => window.__game?.scene.isActive(k) === true, key, { timeout: 20_000 });

test('boots to the main menu, starts the game on tap, no console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');

  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  await waitForScene(page, 'MainMenu');

  // The page must never scroll (iOS rubber-band guard).
  const scrollable = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 1 || document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(scrollable).toBe(false);

  // Canvas is letterboxed inside the viewport, keeping 16:9.
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const vp = page.viewportSize()!;
  expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
  expect(box!.height).toBeLessThanOrEqual(vp.height + 1);
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);

  // Tap/click to start → Game scene.
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await waitForScene(page, 'Game');

  expect(errors, errors.join('\n')).toEqual([]);
});
