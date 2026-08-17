import Phaser from 'phaser';
import { DEPTH, REGISTRY, SCENES } from '@/config/constants';
import type { Rect } from '@/core/level/schema';
import { TEX } from '@/game/art/AssetKeys';
import { Player } from '@/game/entities/Player';
import { InputManager } from '@/game/input/InputManager';
import { KeyboardSource } from '@/game/input/KeyboardSource';
import { setupCamera } from '@/game/systems/CameraRig';
import { buildLevel, type BuiltLevel } from '@/game/systems/LevelLoader';
import { DEFAULT_LEVEL_ID, getLevel } from '@/levels/registry';

export interface GameSceneData {
  levelId?: string;
}

/** The level scene: builds the map, owns the player, systems and per-frame update order. */
export class GameScene extends Phaser.Scene {
  private level!: BuiltLevel;
  private player!: Player;
  private inputManager!: InputManager;

  constructor() {
    super(SCENES.GAME);
  }

  create(data: GameSceneData): void {
    const debug = this.registry.get(REGISTRY.DEBUG_FLAGS) as { level?: string | null } | undefined;
    const levelId = data.levelId ?? debug?.level ?? DEFAULT_LEVEL_ID;
    const entry = getLevel(levelId);
    const levelData = entry.load();

    this.level = buildLevel(this, levelData);
    this.drawZones();

    const spawn = levelData.playerSpawn;
    this.player = new Player(this, spawn.x, spawn.y, this.level.grid);
    this.physics.add.collider(this.player, this.level.walls);

    this.inputManager = new InputManager();
    this.inputManager.addSource(new KeyboardSource(this));
    this.scene.launch(SCENES.HUD, { input: this.inputManager, levelName: entry.name });

    setupCamera(this, this.player, this.level.worldWidth, this.level.worldHeight);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop(SCENES.HUD);
      this.inputManager.destroy();
    });
  }

  private drawZones(): void {
    const { poopSpots, exit } = this.level.data;
    const rect = (r: Rect, key: string) =>
      this.add
        .tileSprite(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, key)
        .setDepth(DEPTH.SPOTS);
    for (const s of poopSpots) rect(s.rect, s.cover === 'hidden' ? TEX.SPOT_HIDDEN : TEX.SPOT_EXPOSED);
    if (exit) rect(exit, TEX.EXIT);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const intent = this.inputManager.update();
    this.player.update(intent, dt);
    if (intent.pausePressed) this.scene.start(SCENES.MAIN_MENU); // temporary until PauseScene (M3)
  }
}
