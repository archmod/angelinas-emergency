import type Phaser from 'phaser';
import { REGISTRY } from '@/config/constants';
import type { AudioSystem } from '@/game/audio/AudioSystem';
import type { SaveManager } from '@/game/systems/SaveManager';
import { Button } from './Button';
import { THEME } from './theme';

/** Small "Sound: On/Off" button that persists to the save file. */
export function addSoundToggle(scene: Phaser.Scene, x: number, y: number): Button {
  const audio = scene.registry.get(REGISTRY.AUDIO) as AudioSystem;
  const save = scene.registry.get(REGISTRY.SAVE) as SaveManager;
  const label = () => `Sound: ${audio.isEnabled ? 'On' : 'Off'}`;
  const btn: Button = new Button(
    scene,
    x,
    y,
    label(),
    () => {
      audio.setEnabled(!audio.isEnabled);
      const p = save.get();
      save.set({ ...p, settings: { ...p.settings, sfx: audio.isEnabled } });
      btn.setText(label());
      audio.play('click');
    },
    { width: 150, height: 44, color: THEME.button.muted, fontSize: 18 },
  );
  return btn;
}
