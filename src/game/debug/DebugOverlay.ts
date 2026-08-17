import Phaser from 'phaser';
import { DEPTH } from '@/config/constants';
import type { Grid } from '@/core/grid/Grid';
import type { Enemy } from '@/game/entities/Enemy';
import type { NoiseSystem } from '@/game/systems/NoiseSystem';
import { textStyle } from '@/game/ui/theme';
import type { DebugFlags } from './flags';

/**
 * In-world debug drawing (hearing radii, nav paths, last-known markers, awareness numbers, noise
 * rings, physics bodies) + a fixed FPS/status line. Hotkeys: ` or F1 overlay, F2 hearing, F3 nav,
 * F4 bodies, F6 god mode.
 */
export class DebugOverlay {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly status: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    readonly flags: DebugFlags,
    private readonly grid: Grid,
    private readonly enemies: () => readonly Enemy[],
    private readonly noise: NoiseSystem,
  ) {
    this.gfx = scene.add.graphics().setDepth(DEPTH.DEBUG);
    this.status = scene.add.text(8, 8, '', textStyle(14, '#7ee787', { backgroundColor: '#00000088' })).setDepth(DEPTH.DEBUG);
    const kb = scene.input.keyboard;
    if (kb) {
      kb.on('keydown-BACKTICK', () => this.toggle('overlay'));
      kb.on('keydown-F1', () => this.toggle('overlay'));
      kb.on('keydown-F2', () => this.toggle('hearing'));
      kb.on('keydown-F3', () => this.toggle('nav'));
      kb.on('keydown-F4', () => this.toggle('bodies'));
      kb.on('keydown-F6', () => this.toggle('god'));
    }
    this.applyBodies();
  }

  toggle(key: 'overlay' | 'hearing' | 'nav' | 'bodies' | 'god'): void {
    this.flags[key] = !this.flags[key];
    if (key !== 'overlay' && key !== 'god') this.flags.overlay = true;
    this.applyBodies();
  }

  private applyBodies(): void {
    const world = this.scene.physics.world;
    world.drawDebug = this.flags.overlay && this.flags.bodies;
    if (world.drawDebug && !world.debugGraphic) world.createDebugGraphic();
    if (!world.drawDebug && world.debugGraphic) world.debugGraphic.clear();
    if (world.debugGraphic) world.debugGraphic.setDepth(DEPTH.DEBUG);
  }

  update(): void {
    const g = this.gfx;
    g.clear();
    const list = this.enemies();
    if (!this.flags.overlay) {
      this.status.setVisible(false);
      for (const l of this.labels) l.setVisible(false);
      return;
    }
    this.status.setVisible(true);
    // Pin to the camera's top-left in world space (scrollFactor 0 misbehaves under camera zoom).
    const cam = this.scene.cameras.main;
    this.status.setPosition(cam.worldView.x + 8 / cam.zoom, cam.worldView.y + 8 / cam.zoom).setScale(1 / cam.zoom);
    const fps = Math.round(this.scene.game.loop.actualFps);
    this.status.setText(
      `fps ${fps} | enemies ${list.length} | [\`/F1] overlay [F2] hearing:${this.flags.hearing ? 'on' : 'off'} [F3] nav:${this.flags.nav ? 'on' : 'off'} [F4] bodies:${this.flags.bodies ? 'on' : 'off'} [F6] god:${this.flags.god ? 'on' : 'off'}`,
    );

    if (this.flags.nav) {
      g.fillStyle(0xff0000, 0.12);
      for (let ty = 0; ty < this.grid.height; ty++) {
        for (let tx = 0; tx < this.grid.width; tx++) {
          if (this.grid.isSolid(tx, ty)) g.fillRect(tx * this.grid.tileSize, ty * this.grid.tileSize, this.grid.tileSize, this.grid.tileSize);
        }
      }
    }

    list.forEach((e, i) => {
      if (this.flags.hearing && e.def.hearingRadius > 0) {
        g.lineStyle(1, 0x7ab6ff, 0.5);
        g.strokeCircle(e.x, e.y, e.def.hearingRadius);
      }
      if (this.flags.nav) {
        const path = e.pathRemaining;
        if (path.length) {
          g.lineStyle(2, 0x7ee787, 0.8);
          g.beginPath();
          g.moveTo(e.x, e.y);
          for (const p of path) g.lineTo(p.x, p.y);
          g.strokePath();
        }
        const lk = e.lastKnown;
        if (lk && e.mode !== 'patrol') {
          g.lineStyle(2, 0xff5a5a, 0.9);
          g.lineBetween(lk.x - 6, lk.y - 6, lk.x + 6, lk.y + 6);
          g.lineBetween(lk.x - 6, lk.y + 6, lk.x + 6, lk.y - 6);
        }
      }
      let label = this.labels[i];
      if (!label) {
        label = this.scene.add.text(0, 0, '', textStyle(12, '#ffffff', { backgroundColor: '#00000099' })).setOrigin(0.5, 0).setDepth(DEPTH.DEBUG);
        this.labels[i] = label;
      }
      label.setVisible(true).setPosition(e.x, e.y + 16).setText(`${e.mode} ${Math.round(e.awareness)}`);
    });
    for (let i = list.length; i < this.labels.length; i++) this.labels[i]!.setVisible(false);

    for (const r of this.noise.recent) {
      const t = r.age / 0.6;
      g.lineStyle(2, 0xffffff, (1 - t) * 0.6);
      g.strokeCircle(r.event.pos.x, r.event.pos.y, r.event.radius * (0.3 + 0.7 * t));
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.status.destroy();
    for (const l of this.labels) l.destroy();
  }
}
