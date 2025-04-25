import { assetsHolder } from "./utils";
import { main as mainScreen, dashboard } from "./screens";
import { Layers, Tiles } from "./types";
import { ClientKeyboard } from "./clientKeyboard";
import { TileMap } from "./TileMap";

export class Renderer {
  private state: any = null;
  private keyboard: ClientKeyboard;

  constructor() {
    this.keyboard = new ClientKeyboard();
    this.state = {};
  }

  fromJSON(state: any) {
    this.state = state;
  }

  render() {
    if (!this.state) return;

    mainScreen.clearScreen();
    dashboard.clearScreen();

    const stageNum = this.state.stage.number;
    const tileMap = new TileMap(this.state.stage.tiles);

    tileMap.renderLayer(Layers.under);
    tileMap.renderLayer(Layers.main);

    this.renderEntities();
    tileMap.renderLayer(Layers.over);

    if (this.state.screenFadeLeft) {
      console.log("---this.state.screenFadeLeft", this.state.gameOverFadeLeft);

      mainScreen.renderChaingingStage(this.state.screenFadeLeft);
    } else if (this.state.isLost) {
      console.log(
        "---this.state.gameOverFadeLeft",
        this.state.gameOverFadeLeft
      );
      mainScreen.renderGameOver(this.state.gameOverFadeLeft);
    } else {
      // TODO: handle second player
      const player = this.state.entities.find((e: any) => e.type === "Player");
      const lives = player?.lives ?? 0;
      dashboard.render(lives, stageNum + 1, this.state.stage.tanks);
    }
  }

  renderEntities() {
    this.state.entities.forEach((e: any) => {
      const {
        position,
        size,
        entityType,
        direction,
        spriteIndex,
        variableSpriteName,
        power,
        lives,
        type,
      } = e;

      if (variableSpriteName) {
        const variableSprites =
          assetsHolder.variableSprites[variableSpriteName];

        const { size, sprite: draw } = variableSprites[spriteIndex];
        draw(position, size);

        return;
      }

      switch (entityType) {
        case "Player": {
          const frames = assetsHolder.sprites.player[power][direction];
          const draw = frames[spriteIndex];
          draw(position, size);
          break;
        }

        case "SecondPlayer": {
          const frames = assetsHolder.sprites.player[power][direction];
          const draw = frames[spriteIndex];
          draw(position, size);
          break;
        }

        case "Bullet": {
          const frames = assetsHolder.sprites.bullet[direction];
          const draw = frames[spriteIndex];
          draw(position, size);
          break;
        }

        case "Flag": {
          assetsHolder.sprites.flag(position, size);
          break;
        }

        case "Enemy": {
          let enemyFrames;
          if (type === 2) {
            enemyFrames = assetsHolder.sprites.enemy[type][lives][direction];
          } else {
            enemyFrames = assetsHolder.sprites.enemy[type][direction];
          }

          const draw = enemyFrames[spriteIndex];
          draw(position, size);
          break;
        }

        case "Powerup": {
          const draw = assetsHolder.sprites.powerup[type];
          draw(position, size);
          break;
        }

        default:
          break;
      }
    });
  }

  createLoop() {
    const loop = () => {
      if (this.state && !this.state?.isPaused) {
        this.render();
      }
      // TODO: handle gameOver

      //   } else if (this.state?.isStopped) {
      //     this.clear();
      //     return;
      //   }

      this.refId = requestAnimationFrame(loop);
    };
    loop();
  }

  clear() {
    cancelAnimationFrame(this.refId);
    this.keyboard.clearListeners();
  }

  play() {
    if (this.state) this.state.isStartScreen = false;
  }

  restart() {
    if (this.state) {
      this.state.isLost = false;
      this.state.isStartScreen = false;
    }
  }
}
