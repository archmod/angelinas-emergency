import Phaser from 'phaser';
import { APP_VERSION, DEPTH, GAME_HEIGHT, GAME_WIDTH, REGISTRY, SCENES } from '@/config/constants';
import { firstIncompleteLevelId } from '@/core/rules/progress';
import { TEX } from '@/game/art/AssetKeys';
import type { DebugFlags } from '@/game/debug/flags';
import type { SaveManager } from '@/game/systems/SaveManager';
import { Button } from '@/game/ui/Button';
import { addMenuBackdrop } from '@/game/ui/MenuBackdrop';
import { addSoundToggle } from '@/game/ui/SoundToggle';
import { headingStyle, THEME, textStyle } from '@/game/ui/theme';
import { CAMPAIGN } from '@/levels/registry';

/** Button layout — the e2e smoke test taps these coordinates (e2e/smoke.spec.ts). */
export const MENU_LAYOUT = {
  PLAY: { x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.58, w: 300, h: 72 },
  LEVELS: { x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.58 + 96, w: 300, h: 64 },
} as const;

/** Tiptoe trail: footprints appear one by one from Angelina's feet (bottom-left) toward the poop (right). */
const TRAIL_STEP_MS = 190;
const TRAIL_HOLD_MS = 1500;
const TRAIL_FADE_MS = 550;
const TRAIL_PAUSE_MS = 900;
const TRAIL_ALPHA = 0.7;
const TRAIL_TINT = 0xc48a52; // mud brown
const TRAIL_SPACING = 62;

/** Title screen: poop + feet themed. Buttons are user gestures, which also unlocks audio on iOS. */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MAIN_MENU);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const save = this.registry.get(REGISTRY.SAVE) as SaveManager;
    const progress = save.get();
    const flags = this.registry.get(REGISTRY.DEBUG_FLAGS) as DebugFlags;
    const continueId = flags.level ?? firstIncompleteLevelId(progress, CAMPAIGN);
    const done = Object.keys(progress.completed).filter((id) => CAMPAIGN.some((l) => l.id === id)).length;

    addMenuBackdrop(this);
    this.addTrail();
    this.addFeet();
    this.addPoopMascot(1010, 462);

    // Title
    const title = this.add
      .text(cx, 150, "Angelina's Emergency", headingStyle(80))
      .setOrigin(0.5)
      .setAngle(-2)
      .setDepth(DEPTH.UI);
    this.tweens.add({ targets: title, scaleX: 1.025, scaleY: 1.025, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(cx, 222, 'Find a spot. Do the deed. Don’t get caught.', textStyle(26, THEME.colors.textDim)).setOrigin(0.5).setDepth(DEPTH.UI);

    // Buttons
    const play = () => this.scene.start(SCENES.GAME, { levelId: continueId });
    const levels = () => this.scene.start(SCENES.LEVEL_SELECT);
    const P = MENU_LAYOUT.PLAY;
    const L = MENU_LAYOUT.LEVELS;
    new Button(this, P.x, P.y, done > 0 && done < CAMPAIGN.length ? 'Continue' : 'Play', play, { width: P.w, height: P.h, fontSize: 30, toes: true });
    new Button(this, L.x, L.y, `Levels  (${done}/${CAMPAIGN.length})`, levels, { width: L.w, height: L.h, color: THEME.button.poop, toes: true });

    // Footer
    this.add
      .text(cx, GAME_HEIGHT - 44, this.sys.game.device.input.touch ? 'Joystick: left side · GO / RUN: right side' : 'WASD / arrows move · Shift run · C sneak · Space/E = GO · Esc pause', textStyle(16, THEME.colors.textDim))
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);
    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 12, `v${APP_VERSION}`, textStyle(16, THEME.colors.textDim)).setOrigin(1, 1).setDepth(DEPTH.UI);
    addSoundToggle(this, GAME_WIDTH - 96, 40);

    this.input.keyboard?.once('keydown-SPACE', play);
    this.input.keyboard?.once('keydown-ENTER', play);
    this.input.keyboard?.once('keydown-L', levels);
  }

  /** Angelina's own big frog feet peeking up from the bottom edge; the right one taps impatiently. */
  private addFeet(): void {
    const scale = 0.72;
    const left = this.add.image(190, 738, TEX.MENU_FOOT).setOrigin(0.5, 0.94).setScale(scale).setAngle(-9).setDepth(DEPTH.FX);
    const right = this.add.image(318, 728, TEX.MENU_FOOT_SMEARED).setOrigin(0.5, 0.94).setScale(scale).setAngle(9).setDepth(DEPTH.FX);
    // toe-tap: pivot about the heel (origin), lift, drop, pause
    this.tweens.add({ targets: right, angle: 20, y: '-=6', duration: 130, yoyo: true, repeat: -1, repeatDelay: 420, ease: 'Sine.easeInOut' });
    // the other foot shifts weight now and then
    this.tweens.add({ targets: left, angle: -6, duration: 900, yoyo: true, repeat: -1, repeatDelay: 1400, ease: 'Sine.easeInOut' });
  }

  /** Big cheeky poop mascot with rising stink wiggles, gently bobbing. */
  private addPoopMascot(x: number, y: number): void {
    this.add.ellipse(x, y + 96, 220, 40, 0x000000, 0.3).setDepth(DEPTH.DECOR);
    const poop = this.add.image(x, y, TEX.MENU_POOP).setScale(0.92).setDepth(DEPTH.DECOR + 1);
    this.tweens.add({ targets: poop, y: y - 8, angle: 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const [dx, delay] of [
      [-42, 0],
      [46, 800],
    ] as const) {
      const y0 = y - 130;
      const s = this.add.image(x + dx, y0, TEX.STINK).setScale(2.4).setAlpha(0).setDepth(DEPTH.DECOR);
      this.tweens.add({
        targets: s,
        y: { from: y0, to: y0 - 44 },
        alpha: { from: 0.85, to: 0 },
        scaleX: { from: 2.2, to: 2.8 },
        duration: 1600,
        delay,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }
  }

  /** Curved footprint trail from the feet, over the buttons, to the poop; loops the tiptoe animation. */
  private addTrail(): void {
    const curve = new Phaser.Curves.Spline([
      new Phaser.Math.Vector2(330, 585),
      new Phaser.Math.Vector2(400, 470),
      new Phaser.Math.Vector2(470, 365),
      new Phaser.Math.Vector2(590, 300),
      new Phaser.Math.Vector2(720, 288),
      new Phaser.Math.Vector2(830, 315),
      new Phaser.Math.Vector2(890, 380),
    ]);
    const n = Math.floor(curve.getLength() / TRAIL_SPACING);
    const prints: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t).normalize();
      const side = i % 2 === 0 ? -1 : 1; // alternate feet either side of the path
      const nx = -tan.y * side * 15;
      const ny = tan.x * side * 15;
      const img = this.add
        .image(p.x + nx, p.y + ny, TEX.MENU_FOOTPRINT)
        .setTint(TRAIL_TINT)
        .setScale(0.5)
        .setRotation(Math.atan2(tan.y, tan.x) + Math.PI / 2)
        .setFlipX(side > 0)
        .setAlpha(0)
        .setDepth(DEPTH.DECOR);
      prints.push(img);
    }
    const cycle = this.runTrail(prints);
    this.time.addEvent({ delay: cycle, loop: true, callback: () => this.runTrail(prints) });
  }

  /** Plays one tiptoe cycle (appear one by one, hold, fade out); returns the cycle length in ms. */
  private runTrail(prints: Phaser.GameObjects.Image[]): number {
    prints.forEach((img, i) =>
      this.tweens.add({
        targets: img,
        alpha: { from: 0, to: TRAIL_ALPHA },
        scale: { from: 0.7, to: 0.5 },
        duration: 200,
        delay: i * TRAIL_STEP_MS,
        ease: 'Back.easeOut',
      }),
    );
    const end = prints.length * TRAIL_STEP_MS + TRAIL_HOLD_MS;
    this.time.delayedCall(end, () => this.tweens.add({ targets: prints, alpha: 0, duration: TRAIL_FADE_MS }));
    return end + TRAIL_FADE_MS + TRAIL_PAUSE_MS;
  }
}
