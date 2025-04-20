import { HeadlessGame } from "./HeadlessGame";

export function startServer(ws: WebSocket) {
  const game = new HeadlessGame(ws);

  game.play();
  game.createLoop();
  return game;
}
