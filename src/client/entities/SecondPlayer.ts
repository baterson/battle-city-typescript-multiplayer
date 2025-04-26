import { Tank } from "./Tank";
import { assetsHolder } from "../utils";
import {
  Direction,
  PowerupTypes,
  PlayerPower,
  ControlKeys,
  Entities,
  Tile,
  Vector,
} from "../types";
import {
  PLAYER_SPAWN_POSITION,
  TANK_SIZE,
  PLAYER_STATS,
  SPAWN_FRAMES,
  DEATH_FRAMES,
  INVINCIBLE_FRAMES,
  SECOND_PLAYER_SPAWN_POSITION,
} from "../constants";
import { powerupEvents } from "./Powerup";
import { EntityManager, TimeManager } from "../managers";
import { isPowerup, isBullet, isPlayer, isFirstPlayer } from "./guards";
import type { HeadlessGame } from "../HeadlessGame";
import type { Player } from "./Player";

function powerupObserver(
  this: SecondPlayer,
  powerupType: PowerupTypes,
  entityManager: EntityManager,
  triggeredBy: Player | SecondPlayer
) {
  if (isFirstPlayer(triggeredBy)) {
    return;
  }

  if (powerupType === PowerupTypes.Tank) {
    this.lives += 1;
  } else if (powerupType === PowerupTypes.Helmet) {
    this.timeManager.setTimer("invincible", INVINCIBLE_FRAMES);
  } else if (
    powerupType === PowerupTypes.Star &&
    this.power < PlayerPower.Second
  ) {
    this.power += 1;
  }
}

export class SecondPlayer extends Tank {
  entityType = "SecondPlayer";
  lives: number;
  // Upgrades from power-ups
  power: PlayerPower;
  timeManager: TimeManager<"spawn" | "death" | "invincible" | "shotCD">;

  constructor(spawnPosition: Vector = SECOND_PLAYER_SPAWN_POSITION) {
    super({ ...spawnPosition }, { ...TANK_SIZE }, Direction.Top);
    this.lives = 3;
    this.power = PlayerPower.Default;
    this.timeManager = new TimeManager();

    this.timeManager.setTimer("spawn", SPAWN_FRAMES);
    this.timeManager.setTimer("invincible", INVINCIBLE_FRAMES);
    powerupEvents.subscribe(this.id, powerupObserver.bind(this));
  }

  toJSON() {
    return {
      ...super.toJSON(),
      lives: this.lives,
      power: this.power,
    };
  }

  fromJSON(json) {
    super.fromJSON(json);
    this.lives = json.lives;
    this.power = json.power;
  }

  update(game: HeadlessGame) {
    this.timeManager.decrementTimers();
    const death = this.timeManager.getTimer("death");
    const spawn = this.timeManager.getTimer("spawn");

    this.animateSprite();

    if (death) {
      if (death === 1) this.respawn(true);
      return;
    } else if (spawn) {
      return;
    }
    game.playSound("neutral");
    this.processInput(game);
  }

  render() {
    this.sprite(this.position, this.spriteSize ?? this.size);
  }

  animateSprite() {
    const spawn = this.timeManager.getTimer("spawn");
    const death = this.timeManager.getTimer("death");
    const invincible = this.timeManager.getTimer("invincible");

    if (spawn) {
      return this.animateVariableSprites(
        this.position,
        assetsHolder.variableSprites.tankSpawn,
        SPAWN_FRAMES,
        spawn,
        "tankSpawn"
      );
    } else if (death) {
      return this.animateVariableSprites(
        this.position,
        assetsHolder.variableSprites.tankDestruction,
        DEATH_FRAMES,
        death,
        "tankDestruction"
      );
    } else if (invincible) {
      // TODO: fix it
      //   const invincibleSprites = assetsHolder.sprites.invincible;
      //   const index = invincible % invincibleSprites.length;
      //   invincibleSprites[index](this.position, this.size);
    }

    this.animateMovement(
      assetsHolder.sprites.player[this.power][this.direction]
    );
  }

  processInput(game: HeadlessGame) {
    const key = game.keyboard.getKey(this.entityType);
    let isMoving = true;

    if (key === ControlKeys.ArrowUp) {
      this.direction = Direction.Top;
    } else if (key === ControlKeys.ArrowDown) {
      this.direction = Direction.Bottom;
    } else if (key === ControlKeys.ArrowLeft) {
      this.direction = Direction.Left;
    } else if (key === ControlKeys.ArrowRight) {
      this.direction = Direction.Right;
    } else {
      game.pauseSound("move");
      isMoving = false;
    }

    if (key === ControlKeys.Space) {
      this.shot(PLAYER_STATS[this.power].shotCD, game);
    }

    if (isMoving) {
      game.pauseSound("neutral");
      game.playSound("move");
      this.move(PLAYER_STATS[this.power].velocity);
    }
  }

  resolveEdgeCollision() {
    this.goBack();
  }

  resolveTileCollision(tiles: Tile[]) {
    if (tiles.length === 1) {
      const newPos = this.forgiveCollision(tiles[0]);
      if (newPos) this.position = { ...newPos };
      else this.goBack();
    } else {
      this.goBack();
    }
  }

  resolveEntityCollision(other: Entities, entityManager) {
    const death = this.timeManager.getTimer("death");

    if (isPowerup(other) || isPlayer(other)) {
      return;
    } else if (isBullet(other) && !death) {
      const invincible = this.timeManager.getTimer("invincible");
      if (invincible) return;

      this.timeManager.setTimer("death", DEATH_FRAMES);
      entityManager.game.playSound("explode");
      this.lives -= 1;
      if (this.lives === 0) {
        this.die(entityManager);
      }
    } else {
      this.goBack();
    }
  }

  respawn(defaultPower = false) {
    if (defaultPower) this.power = PlayerPower.Default;
    this.timeManager.setTimer("spawn", SPAWN_FRAMES);
    this.timeManager.setTimer("invincible", INVINCIBLE_FRAMES);
    this.position = { ...SECOND_PLAYER_SPAWN_POSITION };
    this.prevPosition = { ...SECOND_PLAYER_SPAWN_POSITION };
  }

  deconstruct() {
    powerupEvents.unsubscribe(this.id);
  }
}
