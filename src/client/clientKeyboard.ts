import { ControlKeys } from "./types";

export class ClientKeyboard {
  handleEvent(event: KeyboardEvent, ws: WebSocket, playerType) {
    if (ws.readyState !== 1) return;

    const { code, type } = event;

    if (!ControlKeys[code]) return;

    if (type === "keydown") {
      console.log("this.playerType", playerType);

      ws.send(
        JSON.stringify({
          type: "KEYDOWN",
          key: code,
          playerType: playerType,
        })
      );
    } else {
      ws.send(
        JSON.stringify({
          type: "KEYUP",
          key: code,
          playerType: playerType,
        })
      );
    }
  }

  listenToEvents(ws: WebSocket, playerType: string) {
    // this.playerType = playerType;

    this.onKeyDown = (event: KeyboardEvent) => {
      this.handleEvent(event, ws, playerType);
    };
    this.onKeyUp = (event: KeyboardEvent) => {
      this.handleEvent(event, ws, playerType);
    };

    window.addEventListener("keydown", this.onKeyDown);

    window.addEventListener("keyup", this.onKeyUp);
  }

  clearListeners() {
    // this.playerType = null;

    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
