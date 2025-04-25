import { maps, tanks as tanksConfig } from "./stageConfig";
import {
  DELTA_TIME,
  PLAYER_SPAWN_POSITION,
  SCREEN_FADE_FRAMES,
  SECOND_PLAYER_SPAWN_POSITION,
} from "./constants";
import { TileMap } from "./TileMap";
import { Stage } from "./Stage";
import { EntityManager, TimeManager } from "./managers";
import { Keyboard } from "./Keyboard";

export class HeadlessGame {
  isStartScreen: boolean;
  isLost: boolean;
  isPaused: boolean;
  isStopped: boolean;
  stage: Stage;
  timeManager: TimeManager<"screenFade">;
  loopTimerId: number;
  //   soundManager: SoundManager<"gameover">;

  constructor() {
    this.isStartScreen = true;
    this.isLost = false;
    this.isPaused = false;
    this.isStopped = false;
    this.entityManager = new EntityManager();
    this.timeManager = new TimeManager();
    this.keyboard = new Keyboard();
    // this.soundManager = new SoundManager(["gameover"]);
  }

  onUpdate() {}

  toJSON() {
    return {
      isStartScreen: this.isStartScreen,
      isLost: this.isLost,
      isPaused: this.isPaused,
      isStopped: this.isStopped,
      stage: this.stage.toJSON(),
      entities: this.entityManager.toJSON(),
    };
  }

  createLoop() {
    const fps = 30;
    const frameDuration = 1000 / fps;

    const loop = () => {
      this.update();
      this.onUpdate();

      if (this.isStopped) {
        clearTimeout(this.loopTimerId);

        return;
      }

      return setTimeout(loop, frameDuration);
    };

    this.loopTimerId = loop();
  }

  update() {
    this.timeManager.decrementTimers();
    const sreenFadeLeft = this.timeManager.getTimer("screenFade");
    if (
      this.isLost ||
      this.isStartScreen ||
      this.isPaused ||
      this.isStopped ||
      sreenFadeLeft
    )
      return;

    this.stage.update();
    this.entityManager.update(this);
    this.entityManager.checkCollisions(this.stage.map);
    this.entityManager.removeFromQueue();

    const player = this.entityManager.getFirstPlayer();
    const secondPlayer = this.entityManager.getSecondPlayer();

    const flag = this.entityManager.getFlag();

    if (!player || !secondPlayer || flag.isDestroyed) {
      this.entityManager.clear();
      return this.gameOver();
    }
    if (this.stage.isFinish()) {
      this.toNextStage();
    }
  }

  gameOver() {
    // this.soundManager.play("gameover");
    this.timeManager.setTimer("screenFade", SCREEN_FADE_FRAMES);
    this.isLost = true;
  }

  isWaitingForRestart() {
    const gameOverTime = this.timeManager.getTimer("screenFade");
    return !gameOverTime && this.isLost;
  }

  getNextStageNum() {
    let newNum = this.stage.number + 1;
    if (newNum > maps.length - 1) {
      newNum = 0;
    }
    return newNum;
  }

  toNextStage() {
    this.timeManager.setTimer("screenFade", SCREEN_FADE_FRAMES);
    this.entityManager.clear(false);
    const stageNum = this.getNextStageNum();
    const player: any = this.entityManager.getFirstPlayer();
    const secondPlayer: any = this.entityManager.getSecondPlayer();

    this.stage = new Stage(
      stageNum,
      new TileMap(maps[stageNum]),
      tanksConfig[stageNum]
    );

    player.respawn();
    secondPlayer.respawn();
  }

  play() {
    this.isStartScreen = false;
    this.entityManager.spawnEntity("Player", PLAYER_SPAWN_POSITION);
    this.entityManager.spawnEntity(
      "SecondPlayer",
      SECOND_PLAYER_SPAWN_POSITION
    );
    this.timeManager.setTimer("screenFade", SCREEN_FADE_FRAMES);
    this.stage = new Stage(0, new TileMap(maps[0]), tanksConfig[0], this);
  }

  restart() {
    this.isLost = false;
    this.entityManager.clear();
    this.play();
  }

  stopGame() {
    this.isStopped = true;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }
}
