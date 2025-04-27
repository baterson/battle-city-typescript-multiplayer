import { randomUUID } from "crypto";
import { WebSocket } from "ws";
import { HeadlessGame } from "../client/HeadlessGame";

const DISCONNECT_TIMEOUT = 5000;

export type Connection = {
  ws: WebSocket | null;
  disconnectTimer?: ReturnType<typeof setTimeout>;
  playerType: PlayerType;
};

export type PlayerType = "Player" | "SecondPlayer";

class Room {
  roomId: string;
  connections: Connection[];
  game: HeadlessGame | null;

  constructor() {
    this.roomId = randomUUID();
    this.connections = [];
    this.game = null;
  }

  onCleanup(roomId: string) {}

  addPlayer(ws: WebSocket, playerType: PlayerType) {
    if (this.connections.length >= 2) {
      ws.send(JSON.stringify({ type: "ERROR", data: "Room full" }));
      ws.close();
      return;
    }

    const conn = { ws, playerType };
    this.connections.push(conn);
    this.bindConnection(conn);

    conn.ws.send(
      JSON.stringify({
        type: "JOINED_ROOM",
        data: { roomId: this.roomId, playerType },
      })
    );
  }

  broadcast(msg: object) {
    for (const connection of this.connections) {
      if (connection.ws?.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(msg));
      }
    }
  }

  destroyRoom() {
    this.game?.gameOver();
    this.broadcast({ type: "ROOM_DESTROYED" });
    this.onCleanup(this.roomId);

    console.log("---Cleanup Room---", this.roomId);

    this.connections = [];
    this.game = null;
  }

  handleDisconnect(playerType: PlayerType) {
    const conn = this.connections.find((c) => c.playerType === playerType);
    if (!conn) return;

    conn.ws?.removeAllListeners();
    conn.ws = null;

    this.broadcast({ type: "PLAYER_LEFT" });
    this.game?.pause();

    if (conn.disconnectTimer) clearTimeout(conn.disconnectTimer);

    conn.disconnectTimer = setTimeout(
      () => this.destroyRoom(),
      DISCONNECT_TIMEOUT
    );
  }

  handleReconnect(ws: WebSocket, playerType: PlayerType) {
    const conn = this.connections.find((c) => c.playerType === playerType);

    if (!conn) {
      return ws.send(
        JSON.stringify({ type: "ERROR", data: "Unknown connection" })
      );
    }

    if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "ERROR",
          data: "Already connected on another tab",
        })
      );
      ws.close();
      return;
    }

    if (conn.disconnectTimer) {
      clearTimeout(conn.disconnectTimer);
      delete conn.disconnectTimer;
    }

    conn.ws = ws;
    this.bindConnection(conn);

    if (this.connections.every((c) => c.ws) && this.game) {
      this.connections.forEach((c) => {
        c.ws?.send(
          JSON.stringify({
            type: "START_GAME",
            data: this.game.toJSON(),
            playerType: c.playerType,
          })
        );
      });

      this.game.resume();
    }
  }

  bindConnection({ ws, playerType }: Connection) {
    if (!ws) return;

    ws.on("message", (msg: string) => {
      if (!this.game) return;

      this.game.keyboard.handleMessage(JSON.parse(msg));
    });

    ws.on("close", () => {
      this.handleDisconnect(playerType);
    });

    ws.on("error", (err) => {
      this.handleDisconnect(playerType);
    });
  }

  startGame() {
    // todo: remove?
    if (this.game) {
      return;
    }

    this.game = new HeadlessGame();

    this.game.onUpdate = () => {
      if (this.game) {
        this.broadcast({ type: "STATE_UPDATE", data: this.game.toJSON() });
      }
    };
    this.game.onGameOver = () => {
      this.destroyRoom();
    };

    this.connections.forEach((c) => this.bindConnection(c));

    this.game.play();
    this.game.createLoop();

    this.connections.forEach((c) => {
      c.ws?.send(
        JSON.stringify({
          type: "START_GAME",
          data: this.game.toJSON(),
          playerType: c.playerType,
        })
      );
    });
  }
}

export class RoomManager {
  rooms: Record<string, Room> = {};

  getRoom(roomId: string) {
    return this.rooms[roomId];
  }

  cleanupRoom(roomId: string) {
    delete this.rooms[roomId];
  }

  createRoom() {
    const room = new Room();
    room.onCleanup = (roomId: string) => this.cleanupRoom(roomId);
    this.rooms[room.roomId] = room;
    console.log("createRoom", Object.keys(this.rooms));

    return room;
  }

  findWaitingRoom(playerType: PlayerType) {
    const room = Object.values(this.rooms).find(
      (r) =>
        r.connections.length === 1 &&
        r.connections[0].playerType !== playerType &&
        !r.game
    );
    return room;
  }
}
