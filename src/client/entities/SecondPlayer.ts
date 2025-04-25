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
} from "../constants";
import { powerupEvents } from "./Powerup";
import { SoundManager, TimeManager } from "../managers";
import { isPowerup, isBullet } from "./guards";
import type { HeadlessGame } from "../HeadlessGame";

function powerupObserver(this: Player, powerupType: PowerupTypes) {
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
  soundManager: SoundManager<"explode" | "neutral" | "move">;

  constructor(spawnPosition: Vector) {
    super({ ...spawnPosition }, { ...TANK_SIZE }, Direction.Top);
    this.lives = 3;
    this.power = PlayerPower.Default;
    this.timeManager = new TimeManager();
    this.soundManager = new SoundManager([
      "explode",
      {
        trackName: "neutral",
        loop: true,
      },
      {
        trackName: "move",
        loop: true,
      },
    ]);

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
    this.soundManager.play("neutral");
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
    // console.log("SecondPlayer", key);

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
      this.soundManager.pause("move");
      isMoving = false;
    }

    if (key === ControlKeys.Space) {
      this.shot(PLAYER_STATS[this.power].shotCD, game);
    }

    if (isMoving) {
      this.soundManager.pause("neutral");
      this.soundManager.play("move");
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

    if (isPowerup(other)) {
      return;
    } else if (isBullet(other) && !death) {
      const invincible = this.timeManager.getTimer("invincible");
      if (invincible) return;

      this.timeManager.setTimer("death", DEATH_FRAMES);
      this.soundManager.play("explode");
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
    this.soundManager.pauseAll();
    this.timeManager.setTimer("spawn", SPAWN_FRAMES);
    this.timeManager.setTimer("invincible", INVINCIBLE_FRAMES);
    this.position = { ...PLAYER_SPAWN_POSITION };
    this.prevPosition = { ...PLAYER_SPAWN_POSITION };
  }

  deconstruct() {
    this.soundManager.pauseAll();
    powerupEvents.unsubscribe(this.id);
  }
}
