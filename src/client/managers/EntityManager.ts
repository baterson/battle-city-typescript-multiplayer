import * as entities from "../entities";
import { Enemy, Player, SecondPlayer, Flag, Movable } from "../entities";
import { Entities, Direction, TankTypes, PowerupTypes, Vector } from "../types";
import { checkEntityCollision } from "../utils";
import { TileMap, rigid } from "../TileMap";
import {
  isPlayer,
  isEnemy,
  isTank,
  isFlag,
  isPowerup,
  isSecondPlayer,
  isFirstPlayer,
} from "../entities/guards";
import { TILE_SIDE } from "../constants";
import type { HeadlessGame } from "../HeadlessGame";

/*
Stores all entities
Calculates collisions between them
*/
export class EntityManager {
  pool: { [key: number]: Entities };
  toRemoveQueue: Set<number>;

  constructor() {
    this.pool = {};
    this.toRemoveQueue = new Set();
  }

  toJSON() {
    return Object.values(this.pool).map((entity) => entity.toJSON());
  }

  spawnEntity(type: "Player" | "SecondPlayer", spawnPosition: Vector);
  spawnEntity(type: "Flag");
  spawnEntity(type: "Enemy", tankType: TankTypes, position: Vector);
  spawnEntity(type: "Powerup", powerupType: PowerupTypes, position: Vector);
  spawnEntity(
    type: "Bullet",
    position: Vector,
    direction: Direction,
    shooter: entities.Tank
  );
  spawnEntity(type, ...args) {
    const entity = new entities[type](...args);
    this.pool[entity.id] = entity;
  }

  toRemove = (id: number) => {
    this.toRemoveQueue.add(id);
  };

  /*
	Called at the end of the frame. Delete all entities which death animation is over from the toRemoveQueue
	*/
  removeFromQueue = () => {
    this.toRemoveQueue.forEach((entityId) => {
      const entity = this.pool[entityId];
      const deathLeft = this._checkDeath(entity);
      if (!deathLeft) {
        delete this.pool[entityId];
        entity.deconstruct();
        this.toRemoveQueue.delete(entityId);
      }
    });
  };

  getEnemies(): Enemy[] {
    return this.entities.filter(isEnemy);
  }

  getFirstPlayer(): Player {
    return this.entities.find(isFirstPlayer);
  }

  getSecondPlayer(): SecondPlayer {
    return this.entities.find(isSecondPlayer);
  }

  getFlag(): Flag {
    return this.entities.find(isFlag);
  }

  render() {
    this.entities.forEach((entity) => entity.render());
  }

  update(game: HeadlessGame) {
    this.entities.forEach((entity) => entity.update(game));
  }

  /*
	Calculates collisions for all movable entities
	*/
  checkCollisions(tileMap: TileMap) {
    const seen = new Set();
    this.entities.forEach((entity) => {
      if (isPowerup(entity) || isFlag(entity)) return;

      this.checkTileCollision(entity as entities.Movable, tileMap);
      this.checkEntitiesCollision(entity, seen);
      seen.add(entity.id);
    });
  }

  checkTileCollision(entity: Movable, tileMap: TileMap) {
    if (entity.isOutOfScreen()) {
      entity.resolveEdgeCollision(this);
    } else {
      const [first, second] = entity.getFrontCollisionPoints();
      const tiles = tileMap.lookupRange(first, second);
      const collidable = tiles
        .filter((tile) => rigid.includes(tile.type))
        .filter((tile) =>
          checkEntityCollision(entity.getBoundingBox(), {
            x1: tile.position.x,
            x2: tile.position.x + TILE_SIDE,
            y1: tile.position.y,
            y2: tile.position.y + TILE_SIDE,
          })
        );

      if (collidable.length) {
        entity.resolveTileCollision(collidable, tileMap, this);
      }
    }
  }

  checkEntitiesCollision(entity: Entities, seen: Set<number>) {
    this.entities.forEach((other) => {
      if (entity.id === other.id || seen.has(other.id)) return;

      if (
        this._isInteractive(other) &&
        checkEntityCollision(entity.getBoundingBox(), other.getBoundingBox())
      ) {
        entity.resolveEntityCollision(other, this);
        other.resolveEntityCollision(entity, this);
      }
    });
  }

  /*
	Removes all entities from the pool
	*/
  clear(clearPlayer = true) {
    if (!clearPlayer) {
      const player = this.getFirstPlayer();
      Object.values(this.pool)
        .filter((entity) => entity.id !== player.id)
        .forEach((entity) => entity.deconstruct());

      const secondPlayer = this.getSecondPlayer();
      Object.values(this.pool)
        .filter((entity) => entity.id !== secondPlayer.id)
        .forEach((entity) => entity.deconstruct());
      this.pool = { [player.id]: player, [secondPlayer.id]: secondPlayer };
    } else {
      Object.values(this.pool).forEach((entity) => entity.deconstruct());
      this.pool = {};
    }
    this.toRemoveQueue = new Set();
  }

  _isInteractive(entity: Entities) {
    if (isTank(entity)) {
      return !entity.timeManager.some(["spawn", "death"]);
    }
    return true;
  }

  _checkDeath(entity: Entities) {
    if (isTank(entity)) {
      return entity.timeManager.getTimer("death");
    }
  }

  get entities(): Entities[] {
    return Object.values<Entities>(this.pool);
  }
}
