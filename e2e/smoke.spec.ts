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

  // Tap the Play button (centered, 58% down) → Game scene.
  await canvas.click({ position: { x: box!.width / 2, y: box!.height * 0.58 } });
  await waitForScene(page, 'Game');

  expect(errors, errors.join('\n')).toEqual([]);
});

// Regression: Button hit areas were centered rectangles, but Phaser tests Container hit areas in origin-normalized
// space, so only the top-left quadrant of each button (plus its exact center) reacted — thumb taps mostly missed on iOS.
test('menu buttons respond to off-center taps, not just the exact center', async ({ page, hasTouch }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const canvas = page.locator('#game canvas');
  await waitForScene(page, 'MainMenu');
  const box = (await canvas.boundingBox())!;
  const s = box.width / 1280; // CSS px per game px
  // Game-space coordinates → page coordinates.
  const tap = async (gx: number, gy: number) => {
    const x = box.x + gx * s;
    const y = box.y + gy * s;
    if (hasTouch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };

  // "Levels" button (MENU_LAYOUT.LEVELS): centered at (640, 513.6), 300×64 → press near its bottom-right corner.
  await tap(640 + 130, 513.6 + 26);
  await waitForScene(page, 'LevelSelect');
  // "‹ Back" button: centered at (90, 40), 130×48 → press near its bottom-right corner.
  await tap(90 + 55, 40 + 18);
  await waitForScene(page, 'MainMenu');
  // "Play" button (MENU_LAYOUT.PLAY): centered at (640, 417.6), 300×72 → press right-of-center and low.
  await tap(640 + 120, 417.6 + 28);
  await waitForScene(page, 'Game');

  expect(errors, errors.join('\n')).toEqual([]);
});

// Regression: the virtual joystick divided the rim-clamped thumb offset by the raw finger distance (dragging past the
// ring slowed the player down), and released on GAME_OUT (finger sliding into the letterbox bar stopped the player).
test('virtual joystick: full speed past the ring and while the finger is off-canvas', async ({ page, browserName, hasTouch }) => {
  test.skip(browserName !== 'chromium' || !hasTouch, 'drives raw touch events through CDP');
  await page.goto('/?level=test-01');
  await waitForScene(page, 'MainMenu');
  const box = (await page.locator('#game canvas').boundingBox())!;
  const s = box.width / 1280;
  const g2p = (gx: number, gy: number) => ({ x: box.x + gx * s, y: box.y + gy * s });
  await page.touchscreen.tap(g2p(640, 417.6).x, g2p(640, 417.6).y); // Play
  await waitForScene(page, 'Hud');
  await page.waitForTimeout(300);

  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
  const move = () =>
    page.evaluate(() => {
      const i = (window as unknown as { __game: { scene: { getScene(k: string): { inputManager: { intent: { moveX: number; moveY: number; moveMagnitude: number } } } } } }).__game.scene.getScene('Hud').inputManager.intent;
      return { x: i.moveX, y: i.moveY, m: i.moveMagnitude };
    });
  const settle = () => page.waitForTimeout(120);

  // Stick base near the left edge; drag right well past the 64 px ring → magnitude pinned at 1, direction kept.
  await touch('touchStart', g2p(120, 400));
  await touch('touchMove', g2p(120 + 400, 400));
  await settle();
  let m = await move();
  expect(m.m).toBeCloseTo(1, 2);
  expect(m.x).toBeCloseTo(1, 2);
  await touch('touchMove', g2p(120 + 300, 400 - 300));
  await settle();
  m = await move();
  expect(m.m).toBeCloseTo(1, 2);
  expect(m.x).toBeCloseTo(Math.SQRT1_2, 2);
  expect(m.y).toBeCloseTo(-Math.SQRT1_2, 2);

  // Push left until the finger leaves the canvas (into the letterbox bar) → keeps moving left, not stopped.
  await touch('touchMove', g2p(20, 400));
  await settle();
  await touch('touchMove', { x: Math.max(1, box.x - 20), y: g2p(0, 400).y });
  await settle();
  m = await move();
  expect(m.m).toBeCloseTo(1, 2);
  expect(m.x).toBeCloseTo(-1, 2);

  // Lifting the finger (still off-canvas) releases the stick.
  await touch('touchEnd');
  await settle();
  m = await move();
  expect(m.m).toBe(0);
});

test('keyboard moves Angelina and bushes hide her', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard-only');
  const errors = collectErrors(page);
  await page.goto('/?level=test-01');
  await waitForScene(page, 'MainMenu');
  await page.keyboard.press('Space');
  await waitForScene(page, 'Game');

  const pos = () =>
    page.evaluate(() => {
      const s = (window as unknown as { __game: { scene: { getScene(k: string): { player: { x: number; y: number; hidden: boolean } } } } }).__game.scene.getScene('Game');
      return { x: s.player.x, y: s.player.y, hidden: s.player.hidden };
    });
  const start = await pos();
  // Walk right until she's under the bush block (tiles 3..4 of row 2..3 in test-01), then down into it.
  await page.keyboard.down('d');
  await page.waitForFunction(() => (window as unknown as { __game: { scene: { getScene(k: string): { player: { x: number } } } } }).__game.scene.getScene('Game').player.x >= 3.5 * 32, null, { timeout: 8000 });
  await page.keyboard.up('d');
  const moved = await pos();
  expect(moved.x).toBeGreaterThan(start.x + 40);
  await page.keyboard.down('s');
  await page.waitForFunction(() => (window as unknown as { __game: { scene: { getScene(k: string): { player: { hidden: boolean } } } } }).__game.scene.getScene('Game').player.hidden, null, { timeout: 8000 });
  await page.keyboard.up('s');
  const inBush = await pos();
  expect(inBush.hidden).toBe(true);
  expect(errors.filter((e) => !e.includes('GPU stall')), errors.join('\n')).toEqual([]);
});

test('an enemy that sees Angelina chases and catches her → lose screen → retry', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard to start');
  const errors = collectErrors(page);
  await page.goto('/?debug=1&level=test-01');
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

  // Drop Angelina right in front of the ranger (inside his proximity radius → instant alert).
  await page.evaluate(() => {
    const s = (window as unknown as { __game: { scene: { getScene(k: string): { player: { setPosition(x: number, y: number): void }; enemies: { x: number; y: number; facing: number }[] } } } }).__game.scene.getScene('Game');
    const e = s.enemies[0]!;
    s.player.setPosition(e.x + Math.cos(e.facing) * 30, e.y + Math.sin(e.facing) * 30);
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
  await page.goto('/?debug=1&god=1&level=test-01'); // god: enemies can't catch her, keeps the test deterministic
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
