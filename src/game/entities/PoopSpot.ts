import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/tiles';
import { DEPTH } from '@/config/constants';
import type { PoopSpotDef } from '@/core/level/schema';
import { SPOT_PIN_H, SPOT_TEXTURE_SIZE, TEX } from '@/game/art/AssetKeys';

/**
 * Visuals for one poop spot: the zone marker on the ground, a bobbing objective pin above required spots and the
 * "done" badge once the spot has been used. Every spot is single-use; the PoopSystem owns the rule side.
 */
export class PoopSpot {
  used = false;
  private readonly zone: Phaser.GameObjects.TileSprite;
  private pin: Phaser.GameObjects.Image | null = null;
  private pinTween: Phaser.Tweens.Tween | null = null;
  private badge: Phaser.GameObjects.Image | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: PoopSpotDef,
  ) {
    const r = def.rect;
    // Marker textures are 2× (SPOT_TEXTURE_SIZE); tile them so exactly one marker fills each grid tile of the zone.
    const tileScale = TILE_SIZE / SPOT_TEXTURE_SIZE;
    this.zone = scene.add
      .tileSprite(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, def.cover === 'hidden' ? TEX.SPOT_HIDDEN : TEX.SPOT_EXPOSED)
      .setTileScale(tileScale, tileScale)
      .setDepth(DEPTH.SPOTS)
      .setAlpha(def.required ? 1 : 0.55);
    if (def.required) {
      const y = r.y + r.h / 2 - 6;
      this.pin = scene.add.image(r.x + r.w / 2, y, TEX.SPOT_PIN).setOrigin(0.5, 1).setDepth(DEPTH.OVERHEAD);
      this.pinTween = scene.tweens.add({ targets: this.pin, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  get centerX(): number {
    return this.def.rect.x + this.def.rect.w / 2;
  }
  get centerY(): number {
    return this.def.rect.y + this.def.rect.h / 2;
  }

  /** The spot has been pooped in: fade the zone, drop the pin, show the check badge. */
  markUsed(): void {
    if (this.used) return;
    this.used = true;
    this.scene.tweens.add({ targets: this.zone, alpha: 0.3, duration: 400 });
    if (this.pin) {
      this.pinTween?.stop();
      this.pinTween = null;
      const pin = this.pin;
      this.pin = null;
      this.scene.tweens.add({ targets: pin, y: pin.y - SPOT_PIN_H, alpha: 0, duration: 350, ease: 'Cubic.easeIn', onComplete: () => pin.destroy() });
    }
    // Sits on the zone's top edge (where the pin pointed) so it doesn't cover Angelina or the poop itself.
    this.badge = this.scene.add.image(this.centerX, this.def.rect.y - 6, TEX.SPOT_DONE).setDepth(DEPTH.OVERHEAD).setScale(0.2);
    this.scene.tweens.add({ targets: this.badge, scale: 1, duration: 400, ease: 'Back.easeOut' });
  }

  destroy(): void {
    this.pinTween?.stop();
    this.zone.destroy();
    this.pin?.destroy();
    this.badge?.destroy();
  }
}
