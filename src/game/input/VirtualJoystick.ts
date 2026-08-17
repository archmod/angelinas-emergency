import Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { DEPTH, GAME_WIDTH } from '@/config/constants';
import { joystickVector } from '@/core/input/joystick';
import { TEX } from '@/game/art/AssetKeys';

/**
 * Floating virtual joystick: appears where the thumb lands (left part of the screen), tracks that
 * pointer only, and reports a deadzoned unit vector. Lives in the HUD scene (screen-fixed camera).
 */
export class VirtualJoystick {
  private readonly base: Phaser.GameObjects.Image;
  private readonly thumb: Phaser.GameObjects.Image;
  private pointerId: number | null = null;
  private baseX = 0;
  private baseY = 0;
  private vx = 0;
  private vy = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.base = scene.add.image(0, 0, TEX.JOYSTICK_BASE).setDepth(DEPTH.UI).setVisible(false).setScrollFactor(0);
    this.thumb = scene.add.image(0, 0, TEX.JOYSTICK_THUMB).setDepth(DEPTH.UI + 1).setVisible(false).setScrollFactor(0);
    const r = BALANCE.touch.joystickRadius;
    this.base.setDisplaySize(r * 2.4, r * 2.4);
    this.thumb.setDisplaySize(r * 1.1, r * 1.1);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    // Deliberately NOT releasing on GAME_OUT: on phones the finger often slides off the canvas into the
    // letterbox / safe-area bar mid-push. Phaser stops sending moves while it is outside, so we hold the
    // last vector instead of stopping the player; POINTER_UP(_OUTSIDE) still arrives wherever the finger
    // lifts (window listeners), and `vector` self-releases if the tracked pointer is no longer down.
  }

  /** Unit-ish vector (length 0..1). */
  get vector(): { x: number; y: number } {
    // Safety: if the tracked pointer was lost (touchcancel), release.
    if (this.pointerId !== null) {
      const p = this.scene.input.manager.pointers.find((pt) => pt.id === this.pointerId);
      if (!p || !p.isDown) this.release();
    }
    return { x: this.vx, y: this.vy };
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  private onDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (this.pointerId !== null) return;
    if (over.length > 0) return; // pressed a button/interactive object, not the stick zone
    if (pointer.x > GAME_WIDTH * BALANCE.touch.joystickZone) return;
    this.pointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.base.setPosition(this.baseX, this.baseY).setVisible(true);
    this.thumb.setPosition(this.baseX, this.baseY).setVisible(true);
    this.vx = 0;
    this.vy = 0;
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    const s = joystickVector(pointer.x - this.baseX, pointer.y - this.baseY, BALANCE.touch.joystickRadius, BALANCE.touch.joystickDeadzone);
    this.thumb.setPosition(this.baseX + s.thumbDx, this.baseY + s.thumbDy);
    this.vx = s.x;
    this.vy = s.y;
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.release();
  }

  private release(): void {
    this.pointerId = null;
    this.vx = 0;
    this.vy = 0;
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.base.destroy();
    this.thumb.destroy();
  }
}
