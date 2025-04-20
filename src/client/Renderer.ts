import { maps } from "./stageConfig";
import { TILE_SIDE } from "./constants";
import { assetsHolder } from "./utils";
import { main as mainScreen, dashboard } from "./screens";
import { Layers, Tiles } from "./types";
import { ClientKeyboard } from "./clientKeyboard";
import { TileMap } from "./TileMap";

export class Renderer {
  isStopped: boolean;
  private state: any = null;
  private ws: WebSocket;
  private keyboard: ClientKeyboard;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.keyboard = new ClientKeyboard();

    this.keyboard.listenToEvents(ws);
  }

  /**
   * Receive the latest game JSON state
   */
  fromJSON(state: any) {
    this.state = state;
  }

  /**
   * Render map layers, entities, and UI directly from JSON
   */
  render() {
    if (!this.state) return;

    mainScreen.clearScreen();
    dashboard.clearScreen();

    if (this.state.isStartScreen) {
      mainScreen.renderStartScreen();
      return;
    }

    // grab the map for this stage
    const stageNum = this.state.stage.number;
    const rawTiles = maps[stageNum];
    const tileMap = new TileMap(rawTiles);

    // draw static tiles in three layers
    tileMap.renderLayer(Layers.under);
    tileMap.renderLayer(Layers.main);

    this.renderEntities();
    // top layer (grass)
    tileMap.renderLayer(Layers.over);

    // finally, draw dashboard UI
    const player = this.state.entities.find((e: any) => e.type === "Player");
    const lives = player?.lives ?? 0;
    dashboard.render(lives, stageNum + 1, this.state.stage.tanks);
  }

  renderEntities() {
    this.state.entities.forEach((entity: any) => {
      const { position: pos, size } = entity;

      switch (entity.type) {
        case "Player": {
          const sprites = assetsHolder.sprites.player[entity.power][0];
          sprites[0](pos, size);
          break;
        }
        case "Bullet": {
          const sprites = assetsHolder.sprites.bullet[0];
          sprites[0](pos, size);
          break;
        }
        case "Flag": {
          assetsHolder.sprites.flag(pos, size);
          break;
        }
        default: {
          const t: number = entity.type;
          const powerupSprites = assetsHolder.sprites.powerup[t];
          if (powerupSprites) {
            powerupSprites(pos, size);
          } else {
            const enemySprites = assetsHolder.sprites.enemy[t][0];
            enemySprites[0](pos, size);
          }
        }
      }
    });
  }

  /**
   * Start continuous rendering loop
   */
  createLoop() {
    const loop = () => {
      if (this.isStopped) return;

      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * Hide start screen
   */
  play() {
    if (this.state) this.state.isStartScreen = false;
  }

  /**
   * Reset lost state and resume
   */
  restart() {
    if (this.state) {
      this.state.isLost = false;
      this.state.isStartScreen = false;
    }
  }

  stopGame() {
    this.isStopped = true;
  }
}
