import { Movable } from "./Movable";
import {
  Direction,
  Tile,
  Vector,
  Entities,
  Tiles,
  PlayerPower,
} from "../types";
import { BULLET_VELOCITY, BULLET_SIZE } from "../constants";
import { Player } from "./Player";
import { Enemy } from "./Enemy";
import { EntityManager, SoundManager } from "../managers/";
import { TileMap, bulletThrough } from "../TileMap";
import { isPlayer, isEnemy, isPowerup } from "./guards";
import { assetsHolder } from "../utils";

export class Bullet extends Movable {
  entityType = "Bullet";
  prevPosition: Vector;
  direction: Direction;
  shooter: Player | Enemy;
  soundManager: SoundManager<"hit" | "hitdmg">;

  constructor(position: Vector, direction: Direction, shooter: Player | Enemy) {
    super(position, { ...BULLET_SIZE }, direction);
    this.direction = direction;
    this.shooter = shooter;
    this.soundManager = new SoundManager(["hit", "hitdmg"]);
  }

  update() {
    this.move(BULLET_VELOCITY);
    this.animateMovement(assetsHolder.sprites.bullet[this.direction]);
  }

  render() {
    this.sprite(this.position, this.size);
  }

  resolveEdgeCollision(entityManager: EntityManager) {
    entityManager.toRemove(this.id);
  }

  resolveTileCollision(
    tiles: Tile[],
    tileMap: TileMap,
    entityManager: EntityManager
  ) {
    if (tiles.every((tile) => bulletThrough.includes(tile.type))) return;

    entityManager.toRemove(this.id);
    const canDestroySteel =
      isPlayer(this.shooter) && this.shooter.power === PlayerPower.Second;
    const hasSteel = tiles.some((tile) => tile.type === Tiles.Steel);
    if (hasSteel) {
      this.soundManager.play("hit");
    } else {
      this.soundManager.play("hitdmg");
    }

    tiles.forEach((tile) => {
      if (
        bulletThrough.includes(tile.type) ||
        (tile.type === Tiles.Steel && !canDestroySteel)
      )
        return;
      tileMap.destroy(tile.position);
    });
  }

  resolveEntityCollision(other: Entities, entityManager: EntityManager) {
    if (isPowerup(other)) return;
    if (isPlayer(this.shooter) && isEnemy(other) && other.type >= 1) {
      this.soundManager.play("hit");
    }

    if (entityManager._isInteractive(other)) {
      entityManager.toRemove(this.id);
    }
  }
}
