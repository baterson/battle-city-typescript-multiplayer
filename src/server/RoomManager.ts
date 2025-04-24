import { randomUUID } from "crypto";
import { HeadlessGame } from "../client/HeadlessGame";

const DISCONNECT_TIMEOUT = 2000;

type Connection = {
  ws: WebSocket | null;
  connectionId: string;
  disconnectTimer?: number;
};

class Room {
  roomId: string;
  connections: Connection[];
  game?;

  constructor() {
    this.roomId = randomUUID();
    this.connections = [];
    this.game = null;
    this.isDestroyed = false;
  }

  onCleanup(roomId: string) {}

  addPlayer(ws) {
    console.log("--Adding player is destroy: ", this.isDestroyed);

    if (this.connections.length >= 2) {
      ws.send(JSON.stringify({ type: "ERROR", data: "Room full" }));
      ws.close();
      return;
    }

    const connectionId = randomUUID();
    const conn = { ws, connectionId };
    this.connections.push(conn);
    this.bindConnection(conn);

    ws.send(
      JSON.stringify({
        type: "JOINED_ROOM",
        data: { roomId: this.roomId, connectionId },
      })
    );
  }

  broadcast(msg) {
    for (const connection of this.connections) {
      if (connection.ws?.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(msg));
      }
    }
  }

  handleDisconnect(connectionId: string) {
    const conn = this.connections.find((c) => c.connectionId === connectionId);
    if (!conn) return;

    conn?.ws?.removeAllListeners("message");
    conn?.ws?.removeAllListeners("close");
    conn?.ws?.removeAllListeners("error");

    conn.ws = null;

    this.broadcast({ type: "PLAYER_LEFT" });
    this.game?.pause();

    if (conn.disconnectTimer) clearTimeout(conn.disconnectTimer);

    conn.disconnectTimer = setTimeout(() => {
      this.game?.gameOver();
      this.game?.stopGame();
      this.broadcast({ type: "ROOM_DESTROYED" });
      this.onCleanup(this.roomId);

      console.log("---Cleanup Room---", this.roomId);

      this.isDestroyed = true;
      this.connections = [];
      this.game = null;
    }, DISCONNECT_TIMEOUT);
  }

  handleReconnect(ws: WebSocket, connectionId: string) {
    if (this.isDestroyed) {
      ws.send(
        JSON.stringify({ type: "ERROR", data: "Room has been isDestroyed" })
      );
      ws.close();
      return;
    }

    const conn = this.connections.find((c) => c.connectionId === connectionId);

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
      this.broadcast({ type: "START_GAME", data: this.game.toJSON() });
      this.game.resume();
    }
  }

  bindConnection({
    ws,
    connectionId,
  }: {
    ws: WebSocket;
    connectionId: string;
  }) {
    if (!ws) return;

    ws.removeAllListeners("message");
    ws.removeAllListeners("close");
    ws.removeAllListeners("error");

    ws.on("message", (msg) => {
      if (!this.game || this.isDestroyed) return;

      this.game.keyboard.handleMessage(JSON.parse(msg.toString()));
    });

    ws.on("close", () => {
      this.handleDisconnect(connectionId);
    });

    ws.on("error", (err) => {});
  }

  startGame() {
    if (this.game) {
      console.log("--Game is already started--", this.isDestroyed);
      return;
    }

    this.game = new HeadlessGame();

    this.game.onUpdate = () => {
      if (this.game && !this.game.isStopped) {
        this.broadcast({ type: "STATE_UPDATE", data: this.game.toJSON() });
      }
    };

    this.connections.forEach((c) => this.bindConnection(c));

    this.game.play();
    this.game.createLoop();

    this.broadcast({ type: "START_GAME", data: this.game.toJSON() });
  }
}

export class RoomManager {
  rooms: Record<string, Room> = {};

  cleanupRoom = (roomId) => {
    delete this.rooms[roomId];
  };

  createRoom() {
    const room = new Room();
    room.onCleanup = this.cleanupRoom;
    this.rooms[room.roomId] = room;
    console.log("createRoom", Object.keys(this.rooms));

    return room;
  }

  findWaitingRoom() {
    const room = Object.values(this.rooms).find(
      (r) => r.connections.length === 1 && !r.game
    );
    console.log("findWaitingRoom", Object.keys(this.rooms));
    return room;
  }
}
