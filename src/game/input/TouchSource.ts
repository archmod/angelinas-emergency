import type Phaser from 'phaser';
import { BALANCE } from '@/config/balance';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import type { SourceState } from '@/core/input/intent';
import type { InputSource } from './InputManager';
import { TouchButton } from './TouchButton';
import { VirtualJoystick } from './VirtualJoystick';

/** Touch controls: floating joystick (left) + GO / RUN / TOOT buttons (right). Created inside HudScene. */
export class TouchSource implements InputSource {
  private readonly joystick: VirtualJoystick;
  private readonly actionButton: TouchButton;
  private readonly runButton: TouchButton;
  private readonly fartButton: TouchButton;

  constructor(scene: Phaser.Scene) {
    this.joystick = new VirtualJoystick(scene);
    const margin = 28;
    const ar = BALANCE.touch.actionButtonRadius;
    const rr = BALANCE.touch.runButtonRadius;
    this.actionButton = new TouchButton(scene, GAME_WIDTH - margin - ar, GAME_HEIGHT - margin - ar, ar, 'GO', 0x7ee787);
    this.runButton = new TouchButton(scene, GAME_WIDTH - margin - ar * 2 - rr - 24, GAME_HEIGHT - margin - rr, rr, 'RUN', 0xffd166);
    // TOOT sits above GO: a tap lets a little gas out early (quiet) before it forces its way out (loud).
    const fr = BALANCE.touch.fartButtonRadius;
    this.fartButton = new TouchButton(scene, GAME_WIDTH - margin - ar, GAME_HEIGHT - margin - ar * 2 - 22 - fr, fr, 'TOOT', 0xb5e550);
  }

  read(): SourceState {
    const v = this.joystick.vector;
    return {
      moveX: v.x,
      moveY: v.y,
      run: this.runButton.held,
      sneak: false,
      action: this.actionButton.held,
      fart: this.fartButton.takeTap() || this.fartButton.held,
      pause: false,
    };
  }

  destroy(): void {
    this.joystick.destroy();
    this.actionButton.destroy();
    this.runButton.destroy();
    this.fartButton.destroy();
  }
}
