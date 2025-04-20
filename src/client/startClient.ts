import sprite from "./assets/sprites.png";
import explode from "./assets/audio/explode.flac";
import hit from "./assets/audio/hit.flac";
import hitdmg from "./assets/audio/hitdmg.flac";
import neutral from "./assets/audio/neutral.flac";
import powerup from "./assets/audio/powerup.flac";
import move from "./assets/audio/move.flac";
import start from "./assets/audio/start.flac";
import gameover from "./assets/audio/gameover.flac";
import { assetsHolder } from "./utils/assetsHolder";
import { clientKeyboard } from "./clientKeyboard";
import { Renderer } from "./Renderer";
import { createConnection } from "./multiplayer";

async function main() {
  assetsHolder.runPreloader();
  await Promise.all([
    assetsHolder.loadSprite(sprite),
    assetsHolder.loadAudio({
      explode,
      hit,
      hitdmg,
      neutral,
      powerup,
      move,
      start,
      gameover,
    }),
  ]);
  assetsHolder.stopPreloader();
  console.log("---connection");

  const socket = await createConnection();

  const game = new Renderer(socket);
  game.keyboard.listenToEvents(socket);
  game.play();

  socket.addEventListener("message", (e) => {
    const message = JSON.parse(e.data);

    if (message.type === "STATE") {
      game.fromJSON(message.data);
    }
  });

  socket.addEventListener("close", () => {
    console.log("🔴 Disconnected");
    game.stopGame();
  });

  socket.addEventListener("error", (err) => {
    console.error("⚠️ WebSocket error", err);
    game.stopGame();
  });

  console.log("++++Connected");

  return game.createLoop();
}

main();
