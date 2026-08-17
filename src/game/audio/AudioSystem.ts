import type Phaser from 'phaser';

export type SfxName = 'click' | 'step' | 'suspicious' | 'alert' | 'poopNoise' | 'poopDone' | 'caught' | 'accident' | 'win' | 'slip' | 'exitOpen' | 'gurgle' | 'fart' | 'fartBig' | 'sniff';

interface Tone {
  type: OscillatorType;
  from: number;
  to?: number;
  duration: number;
  gain?: number;
  delay?: number;
  /** Frequency glide curve: 'exp' (default) or 'lin'. */
  glide?: 'exp' | 'lin';
}

/** Procedural SFX (no audio files): tiny synth patches on the game's shared AudioContext. */
const PATCHES: Record<SfxName, Tone[]> = {
  click: [{ type: 'square', from: 900, duration: 0.04, gain: 0.08 }],
  step: [{ type: 'sine', from: 140, to: 90, duration: 0.05, gain: 0.05 }],
  suspicious: [
    { type: 'sine', from: 520, duration: 0.09, gain: 0.12 },
    { type: 'sine', from: 780, duration: 0.14, gain: 0.12, delay: 0.1 },
  ],
  alert: [
    { type: 'sawtooth', from: 300, to: 900, duration: 0.18, gain: 0.12 },
    { type: 'sawtooth', from: 300, to: 900, duration: 0.18, gain: 0.12, delay: 0.22 },
  ],
  poopNoise: [{ type: 'sine', from: 110, to: 70, duration: 0.16, gain: 0.1 }],
  poopDone: [
    { type: 'sine', from: 320, to: 70, duration: 0.22, gain: 0.16 },
    { type: 'sine', from: 180, to: 60, duration: 0.18, gain: 0.1, delay: 0.16 },
  ],
  caught: [
    { type: 'square', from: 140, to: 100, duration: 0.45, gain: 0.12 },
    { type: 'square', from: 100, to: 70, duration: 0.4, gain: 0.1, delay: 0.3 },
  ],
  accident: [{ type: 'sawtooth', from: 400, to: 60, duration: 0.7, gain: 0.12 }],
  win: [
    { type: 'triangle', from: 523, duration: 0.12, gain: 0.12 },
    { type: 'triangle', from: 659, duration: 0.12, gain: 0.12, delay: 0.12 },
    { type: 'triangle', from: 784, duration: 0.12, gain: 0.12, delay: 0.24 },
    { type: 'triangle', from: 1047, duration: 0.3, gain: 0.14, delay: 0.36 },
  ],
  slip: [
    { type: 'sine', from: 200, to: 420, duration: 0.12, gain: 0.1, glide: 'lin' },
    { type: 'sine', from: 420, to: 180, duration: 0.16, gain: 0.1, delay: 0.12, glide: 'lin' },
  ],
  exitOpen: [
    { type: 'triangle', from: 660, duration: 0.1, gain: 0.1 },
    { type: 'triangle', from: 990, duration: 0.18, gain: 0.1, delay: 0.1 },
  ],
  // Tummy rumble: three quick rising blips (the "uh-oh" before a forced fart).
  gurgle: [
    { type: 'sine', from: 180, to: 320, duration: 0.07, gain: 0.07 },
    { type: 'sine', from: 220, to: 380, duration: 0.07, gain: 0.07, delay: 0.1 },
    { type: 'sine', from: 260, to: 430, duration: 0.09, gain: 0.08, delay: 0.2 },
  ],
  // A polite little toot.
  fart: [
    { type: 'sawtooth', from: 120, to: 70, duration: 0.18, gain: 0.09 },
    { type: 'square', from: 60, to: 45, duration: 0.2, gain: 0.05, delay: 0.02 },
  ],
  // The big one: long descending rasp with a second ripple.
  fartBig: [
    { type: 'sawtooth', from: 100, to: 45, duration: 0.55, gain: 0.13 },
    { type: 'square', from: 55, to: 38, duration: 0.5, gain: 0.07, delay: 0.04 },
    { type: 'sawtooth', from: 90, to: 60, duration: 0.2, gain: 0.08, delay: 0.32, glide: 'lin' },
  ],
  // An enemy catching a whiff.
  sniff: [
    { type: 'triangle', from: 700, to: 500, duration: 0.12, gain: 0.07 },
    { type: 'triangle', from: 500, to: 380, duration: 0.14, gain: 0.07, delay: 0.12 },
  ],
};

export class AudioSystem {
  private enabled = true;
  private readonly ctx: AudioContext | null;
  private lastPlayed = new Map<SfxName, number>();

  constructor(private readonly game: Phaser.Game) {
    const mgr = game.sound as Phaser.Sound.WebAudioSoundManager & { context?: AudioContext };
    this.ctx = mgr.context ?? null;
    // iOS suspends the context after backgrounding/phone calls; resume on the next gesture.
    document.addEventListener('pointerdown', () => void this.resume(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.resume();
    });
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }
  get isEnabled(): boolean {
    return this.enabled;
  }

  private async resume(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        /* not allowed yet */
      }
    }
  }

  /** Plays a patch; `minInterval` (s) throttles spammy sounds like footsteps. */
  play(name: SfxName, minInterval = 0): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (now - last < minInterval) return;
    this.lastPlayed.set(name, now);
    for (const t of PATCHES[name]) this.tone(t, now + (t.delay ?? 0));
  }

  private tone(t: Tone, at: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.from, at);
    if (t.to !== undefined) {
      if (t.glide === 'lin') osc.frequency.linearRampToValueAtTime(t.to, at + t.duration);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), at + t.duration);
    }
    const g = t.gain ?? 0.1;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(g, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + t.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + t.duration + 0.02);
    void this.game;
  }
}
