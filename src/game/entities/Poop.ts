import Phaser from 'phaser';
import { DEPTH } from '@/config/constants';
import { TEX } from '@/game/art/AssetKeys';

/** A completed poop: stays on the ground; enemies who step in it slip. */
export class Poop extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.POOP);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.SPOTS + 1);
    this.body.setCircle(10, this.width / 2 - 10, this.height / 2 - 10);
    this.setScale(0.2);
    scene.tweens.add({ targets: this, scale: 1, duration: 350, ease: 'Back.easeOut' });
  }
}
