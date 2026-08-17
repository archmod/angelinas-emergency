import Phaser from 'phaser';
import { DEPTH } from '@/config/constants';
import { TEX } from '@/game/art/AssetKeys';

const SCALE = 0.5; // texture is drawn at 2×

/** A completed poop: stays on the ground with stink wisps; enemies who step in it slip. */
export class Poop extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  private readonly stink: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.POOP);
    scene.add.existing(this);
    this.setScale(SCALE);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.SPOTS + 1);
    this.body.setCircle(10, this.width / 2 - 10, this.height / 2 - 10);
    this.setScale(SCALE * 0.2);
    scene.tweens.add({ targets: this, scale: SCALE, duration: 350, ease: 'Back.easeOut' });
    this.stink = scene.add.image(x, y - 18, TEX.STINK).setScale(SCALE).setAlpha(0).setDepth(DEPTH.SPOTS + 2);
    scene.tweens.add({ targets: this.stink, alpha: { from: 0.2, to: 0.9 }, y: y - 26, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
  }

  override destroy(fromScene?: boolean): void {
    this.stink.destroy();
    super.destroy(fromScene);
  }
}
