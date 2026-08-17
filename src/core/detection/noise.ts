import { dist, type Vec2 } from '@/core/math/vec';

export type NoiseKind = 'footstep' | 'poop' | 'shout' | 'throw' | 'bump';

export interface NoiseEvent {
  pos: Vec2;
  /** How far the sound carries on its own (px). */
  radius: number;
  /** 0..1 intensity. */
  loudness: number;
  kind: NoiseKind;
  /** Who made it ('player', or an enemy id for shouts) — listeners ignore their own noises. */
  sourceId: string;
}

/**
 * How strongly a listener perceives a noise: 0 (inaudible) .. loudness (at the source).
 * Reach = event radius + listener hearing radius; falls off linearly.
 */
export function hearingLevel(listenerPos: Vec2, hearingRadius: number, event: NoiseEvent): number {
  const reach = event.radius + hearingRadius;
  if (reach <= 0) return 0;
  const d = dist(listenerPos, event.pos);
  if (d >= reach) return 0;
  return event.loudness * (1 - d / reach);
}
