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

test('keyboard moves Angelina and bushes hide her', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard-only');
  const errors = collectErrors(page);
  await page.goto('/');
  await waitForScene(page, 'MainMenu');
  await page.keyboard.press('Space');
  await waitForScene(page, 'Game');

  const pos = () =>
    page.evaluate(() => {
      const s = (window as unknown as { __game: { scene: { getScene(k: string): { player: { x: number; y: number; hidden: boolean } } } } }).__game.scene.getScene('Game');
      return { x: s.player.x, y: s.player.y, hidden: s.player.hidden };
    });
  const start = await pos();
  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.keyboard.up('d');
  const moved = await pos();
  expect(moved.x).toBeGreaterThan(start.x + 40);

  // Test level: bush block at tiles (3..4, 2..3) → walk down into it.
  await page.keyboard.down('s');
  await page.waitForTimeout(450);
  await page.keyboard.up('s');
  await page.waitForTimeout(100);
  const inBush = await pos();
  expect(inBush.hidden).toBe(true);

  expect(errors.filter((e) => !e.includes('GPU stall')), errors.join('\n')).toEqual([]);
});

test('an enemy that sees Angelina chases and catches her → lose screen → retry', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard to start');
  const errors = collectErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'MainMenu');
  await page.keyboard.press('Space');
  await waitForScene(page, 'Game');
  await page.waitForTimeout(300);

  type Snap = { px: number; py: number; mode: string; awareness: number; ex: number; ey: number };
  const snap = () =>
    page.evaluate((): Snap => {
      const s = (window as unknown as { __game: { scene: { getScene(k: string): { player: { x: number; y: number }; enemies: { mode: string; awareness: number; x: number; y: number }[] } } } }).__game.scene.getScene('Game');
      const e = s.enemies[0]!;
      return { px: s.player.x, py: s.player.y, mode: e.mode, awareness: e.awareness, ex: e.x, ey: e.y };
    });
  const before = await snap();
  expect(before.mode).toBe('patrol');

  // Drop Angelina 3 tiles directly in front of the ranger's current facing.
  await page.evaluate(() => {
    const s = (window as unknown as { __game: { scene: { getScene(k: string): { player: { setPosition(x: number, y: number): void }; enemies: { x: number; y: number; facing: number }[] } } } }).__game.scene.getScene('Game');
    const e = s.enemies[0]!;
    s.player.setPosition(e.x + Math.cos(e.facing) * 96, e.y + Math.sin(e.facing) * 96);
  });
  await page.waitForFunction(
    () => (window as unknown as { __game: { scene: { getScene(k: string): { enemies: { mode: string }[] } } } }).__game.scene.getScene('Game').enemies[0]!.mode === 'chase',
    null,
    { timeout: 6000 },
  );
  // Caught → result screen (lose) → retry puts her back at the spawn point.
  await waitForScene(page, 'Result');
  const resultTitle = await page.evaluate(() => {
    const r = (window as unknown as { __game: { scene: { getScene(k: string): { children: { list: { text?: string }[] } } } } }).__game.scene.getScene('Result');
    return r.children.list.map((c) => c.text).filter(Boolean);
  });
  expect(resultTitle.join(' ')).toContain('Caught!');
  await page.keyboard.press('Space');
  await waitForScene(page, 'Game');
  await page.waitForFunction(
    (spawn) => {
      const s = (window as unknown as { __game: { scene: { getScene(k: string): { player: { x: number; y: number }; enemies: { mode: string }[] } } } }).__game.scene.getScene('Game');
      return Math.abs(s.player.x - spawn.px) < 2 && Math.abs(s.player.y - spawn.py) < 2 && s.enemies[0]!.mode === 'patrol';
    },
    { px: before.px, py: before.py },
    { timeout: 8000 },
  );
  expect(errors.filter((e) => !e.includes('GPU stall')), errors.join('\n')).toEqual([]);
});

test('hold GO on a spot to poop, then reach the exit to win', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard');
  const errors = collectErrors(page);
  await page.goto('/?debug=1&god=1'); // god: enemies can't catch her, keeps the test deterministic
  await waitForScene(page, 'MainMenu');
  await page.keyboard.press('Space');
  await waitForScene(page, 'Game');
  await page.waitForTimeout(200);

  type G = {
    player: { setPosition(x: number, y: number): void };
    run: { poopsCompleted: number; objectives: { exitOpen: boolean; won: boolean } };
    level: { data: { poopSpots: { rect: { x: number; y: number; w: number; h: number } }[]; exit: { x: number; y: number; w: number; h: number } } };
  };
  const gameScene = (): G => (window as unknown as { __game: { scene: { getScene(k: string): G } } }).__game.scene.getScene('Game');

  // Teleport onto the first (hidden) spot and hold Space.
  await page.evaluate((fnSrc) => {
    const g = (new Function(`return (${fnSrc})()`) as () => G)();
    const r = g.level.data.poopSpots[0]!.rect;
    g.player.setPosition(r.x + r.w / 2, r.y + r.h / 2);
  }, gameScene.toString());
  await page.keyboard.down('Space');
  await page.waitForFunction((fnSrc) => (new Function(`return (${fnSrc})()`) as () => G)().run.poopsCompleted >= 1, gameScene.toString(), { timeout: 8000 });
  await page.keyboard.up('Space');
  expect(await page.evaluate((fnSrc) => (new Function(`return (${fnSrc})()`) as () => G)().run.objectives.exitOpen, gameScene.toString())).toBe(true);

  // Walk into the exit → win → Result scene.
  await page.evaluate((fnSrc) => {
    const g = (new Function(`return (${fnSrc})()`) as () => G)();
    const e = g.level.data.exit;
    g.player.setPosition(e.x + e.w / 2, e.y + e.h / 2);
  }, gameScene.toString());
  await waitForScene(page, 'Result');
  const texts = await page.evaluate(() => {
    const r = (window as unknown as { __game: { scene: { getScene(k: string): { children: { list: { text?: string }[] } } } } }).__game.scene.getScene('Result');
    return r.children.list.map((c) => c.text).filter(Boolean).join(' ');
  });
  expect(texts).toContain('Relief!');
  expect(errors.filter((e) => !e.includes('GPU stall')), errors.join('\n')).toEqual([]);
});

test('Esc pauses and resumes the game', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard');
  await page.goto('/');
  await waitForScene(page, 'MainMenu');
  await page.keyboard.press('Space');
  await waitForScene(page, 'Game');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await waitForScene(page, 'Pause');
  const paused = await page.evaluate(() => (window as unknown as { __game: { scene: { isPaused(k: string): boolean } } }).__game.scene.isPaused('Game'));
  expect(paused).toBe(true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const g = (window as unknown as { __game: { scene: { isPaused(k: string): boolean; isActive(k: string): boolean } } }).__game;
    return !g.scene.isPaused('Game') && !g.scene.isActive('Pause');
  });
});
