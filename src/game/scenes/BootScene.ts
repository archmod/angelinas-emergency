import Phaser from 'phaser';
import { REGISTRY, SCENES } from '@/config/constants';
import { readDebugFlags } from '@/game/debug/flags';
import { AudioSystem } from '@/game/audio/AudioSystem';
import { SaveManager } from '@/game/systems/SaveManager';

/** First scene: reads URL flags into the registry, then hands off to Preload. Loads nothing. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create(): void {
    const params = new URLSearchParams(window.location.search);
    this.registry.set(REGISTRY.ART_MODE, params.get('art') ?? 'placeholder');
    this.registry.set(REGISTRY.DEBUG_FLAGS, readDebugFlags());
    const save = new SaveManager();
    this.registry.set(REGISTRY.SAVE, save);
    const audio = new AudioSystem(this.game);
    audio.setEnabled(save.get().settings.sfx);
    this.registry.set(REGISTRY.AUDIO, audio);
    this.scene.start(SCENES.PRELOAD);
  }
}
