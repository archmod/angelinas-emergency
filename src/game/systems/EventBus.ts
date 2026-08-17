import Phaser from 'phaser';
import type { BrainMode } from '@/core/ai/enemyBrain';
import type { NoiseEvent } from '@/core/detection/noise';
import type { Vec2 } from '@/core/math/vec';

/** Payloads for every in-game event. Keys are the event names. */
export interface GameEvents {
  'enemy:mode': { id: string; from: BrainMode; to: BrainMode; pos: Vec2 };
  'player:caught': { enemyId: string };
  'player:spotted': { enemyId: string };
  noise: NoiseEvent;
  'level:won': Record<string, never>;
  'level:lost': { reason: 'caught' | 'accident' };
  'poop:completed': { total: number; spotId: string; required: boolean };
  /** She farted. `forced` = it slipped out at full pressure; `strength` 0..1 (louder = bigger). */
  fart: { forced: boolean; strength: number };
  'ui:pause': Record<string, never>;
}

/** Typed wrapper over Phaser's EventEmitter, one instance per level run (created by GameScene). */
export class EventBus {
  private readonly emitter = new Phaser.Events.EventEmitter();

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    this.emitter.emit(event, payload);
  }
  on<K extends keyof GameEvents>(event: K, fn: (payload: GameEvents[K]) => void, context?: unknown): () => void {
    this.emitter.on(event, fn, context);
    return () => this.emitter.off(event, fn, context);
  }
  once<K extends keyof GameEvents>(event: K, fn: (payload: GameEvents[K]) => void, context?: unknown): void {
    this.emitter.once(event, fn, context);
  }
  destroy(): void {
    this.emitter.removeAllListeners();
  }
}
