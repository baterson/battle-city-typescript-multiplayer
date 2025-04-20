import { createServer } from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { assetsHolder } from "../client/utils/assetsHolder";
import { startServer } from "../client/startServer";

const server = createServer();
const wss = new WebSocketServer({ noServer: true });
const rooms: Record<string, WebSocket[]> = {};
assetsHolder.loadServer();

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);

    const game = startServer(ws);

    ws.on("message", (message) => {
      //   console.log(JSON.parse(message));

      game.keyboard.handleMessage(JSON.parse(message));
      //   ws.emit("message", message);
      //   wss.emit("message", message, ws);
    });

    ws.on("close", () => {
      console.log("🔴 Client disconnected");
      game.stopGame();
      socket.destroy();
    });
  });
});

server.listen(8080, () => {
  console.log("WebSocket server running at ws://localhost:8080/");
});
