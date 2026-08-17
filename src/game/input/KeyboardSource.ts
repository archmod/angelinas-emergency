import Phaser from 'phaser';
import type { SourceState } from '@/core/input/intent';
import type { InputSource } from './InputManager';

/** WASD/arrows to move, Shift = run, C = sneak, Space/E = action, F = fart, Esc/P = pause. */
export class KeyboardSource implements InputSource {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly kb: Phaser.Input.Keyboard.KeyboardPlugin;
  /** Set on every F keydown, cleared when read: a tap shorter than one frame still registers. */
  private fartLatch = false;
  private readonly onFartKey = (): void => {
    this.fartLatch = true;
  };

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('KeyboardSource: keyboard plugin disabled');
    this.kb = kb;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,C,SPACE,E,F,ESC,P', true, false) as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    kb.on('keydown-F', this.onFartKey);
  }

  read(): SourceState {
    const k = this.keys;
    const down = (name: string) => k[name]?.isDown === true;
    const x = (down('D') || down('RIGHT') ? 1 : 0) - (down('A') || down('LEFT') ? 1 : 0);
    const y = (down('S') || down('DOWN') ? 1 : 0) - (down('W') || down('UP') ? 1 : 0);
    return {
      moveX: x,
      moveY: y,
      run: down('SHIFT'),
      sneak: down('C'),
      action: down('SPACE') || down('E'),
      fart: this.takeFartTap() || down('F'),
      pause: down('ESC') || down('P'),
    };
  }

  private takeFartTap(): boolean {
    const t = this.fartLatch;
    this.fartLatch = false;
    return t;
  }

  destroy(): void {
    this.kb.off('keydown-F', this.onFartKey);
    for (const key of Object.values(this.keys)) key.destroy();
  }
}
