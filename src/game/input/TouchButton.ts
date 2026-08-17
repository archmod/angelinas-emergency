import Phaser from 'phaser';
import { DEPTH } from '@/config/constants';
import { TEX } from '@/game/art/AssetKeys';
import { THEME, textStyle } from '@/game/ui/theme';

/** Big round on-screen button. `held` is true while any pointer is down on it. */
export class TouchButton {
  readonly image: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  private readonly downPointers = new Set<number>();
  private tapLatch = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, text: string, tint: number) {
    this.image = scene.add
      .image(x, y, TEX.BUTTON)
      .setDisplaySize(radius * 2, radius * 2)
      .setTint(tint)
      .setDepth(DEPTH.UI)
      .setScrollFactor(0)
      .setInteractive(new Phaser.Geom.Circle(64, 64, 70), Phaser.Geom.Circle.Contains);
    this.label = scene.add
      .text(x, y, text, textStyle(Math.round(radius * 0.42), THEME.colors.text, { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setDepth(DEPTH.UI + 1)
      .setScrollFactor(0);

    this.image.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.press(p.id));
    this.image.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => this.releasePointer(p.id));
    this.image.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, (p: Phaser.Input.Pointer) => this.releasePointer(p.id));
    scene.input.on(Phaser.Input.Events.GAME_OUT, () => this.releaseAll());
  }

  get held(): boolean {
    return this.downPointers.size > 0;
  }

  /** True once per press, even if the finger came and went between two frames. */
  takeTap(): boolean {
    const t = this.tapLatch;
    this.tapLatch = false;
    return t;
  }

  setPosition(x: number, y: number): void {
    this.image.setPosition(x, y);
    this.label.setPosition(x, y);
  }

  private press(id: number): void {
    this.downPointers.add(id);
    this.tapLatch = true;
    this.refresh();
  }
  private releasePointer(id: number): void {
    this.downPointers.delete(id);
    this.refresh();
  }
  private releaseAll(): void {
    this.downPointers.clear();
    this.refresh();
  }
  private refresh(): void {
    this.image.setAlpha(this.held ? 1 : 0.7);
    this.image.setScale(this.image.scaleX * (this.held ? 1 : 1), this.image.scaleY);
  }

  destroy(): void {
    this.image.destroy();
    this.label.destroy();
  }
}
