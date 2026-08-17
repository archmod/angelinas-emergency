import Phaser from 'phaser';
import type { SourceState } from '@/core/input/intent';
import type { InputSource } from './InputManager';

/** WASD/arrows to move, Shift = run, C = sneak, Space/E = action, Esc/P = pause. */
export class KeyboardSource implements InputSource {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('KeyboardSource: keyboard plugin disabled');
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,C,SPACE,E,ESC,P', true, false) as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
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
      pause: down('ESC') || down('P'),
    };
  }

  destroy(): void {
    for (const key of Object.values(this.keys)) key.destroy();
  }
}
