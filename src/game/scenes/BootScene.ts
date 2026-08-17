import Phaser from 'phaser';
import { REGISTRY, SCENES } from '@/config/constants';
import { readDebugFlags } from '@/game/debug/flags';
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
    this.registry.set(REGISTRY.SAVE, new SaveManager());
    this.scene.start(SCENES.PRELOAD);
  }
}
