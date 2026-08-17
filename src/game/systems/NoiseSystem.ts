import type { NoiseEvent } from '@/core/detection/noise';
import type { EventBus } from './EventBus';

/** Collects noise events during a frame; DetectionSystem drains them once per frame. */
export class NoiseSystem {
  private buffer: NoiseEvent[] = [];
  /** Recent events kept briefly for the debug overlay. */
  readonly recent: { event: NoiseEvent; age: number }[] = [];

  constructor(private readonly bus: EventBus) {}

  emit(event: NoiseEvent): void {
    this.buffer.push(event);
    this.recent.push({ event, age: 0 });
    this.bus.emit('noise', event);
  }

  /** Returns and clears this frame's events. */
  drain(): NoiseEvent[] {
    const out = this.buffer;
    this.buffer = [];
    return out;
  }

  update(dt: number): void {
    for (const r of this.recent) r.age += dt;
    while (this.recent.length && this.recent[0]!.age > 0.6) this.recent.shift();
  }
}
