import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { assetsHolder } from "../client/utils/assetsHolder";
import { PlayerType, RoomManager } from "./RoomManager";

const PORT = 8080;

assetsHolder.loadServer();

const server = createServer();
const wss = new WebSocketServer({ noServer: true });

const roomManager = new RoomManager();

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const action = url.searchParams.get("action");
  const playerType = url.searchParams.get("playerType");
  const roomId = url.searchParams.get("roomId");

  wss.handleUpgrade(req, socket, head, (ws) => {
    switch (action) {
      case "create": {
        const room = roomManager.createRoom();
        room.addPlayer(ws, "Player");
        return;
      }
      case "find": {
        const waiting = roomManager.findWaitingRoom("SecondPlayer");
        if (!waiting) {
          ws.send(
            JSON.stringify({ type: "ERROR", data: "No rooms available" })
          );
          ws.close();
        } else {
          waiting.addPlayer(ws, "SecondPlayer");
          waiting.startGame();
          console.log("--Starting new game--");
        }
        return;
      }
      case "reconnect": {
        const room = roomManager.getRoom(roomId as string);
        console.log("reconnect room", Object.keys(roomManager.rooms), roomId);

        if (!room) {
          ws.send(JSON.stringify({ type: "ERROR", data: "Room not found" }));
          ws.close();
        } else if (room?.game?.isLost) {
          ws.send(JSON.stringify({ type: "ERROR", data: "Game is lost" }));
          ws.close();
        } else {
          room.handleReconnect(ws, playerType as PlayerType);
        }
        return;
      }
    }

    ws.send(
      JSON.stringify({ type: "ERROR", data: `Invalid action ${action}` })
    );
    ws.close();
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});
