import { ControlKeys } from "./types";

export class ClientKeyboard {
  handleEvent(event: KeyboardEvent, ws: WebSocket) {
    const { code, type } = event;

    if (!ControlKeys[code]) return;

    if (type === "keydown") {
      console.log("this.playerType", this.playerType);

      ws.send(
        JSON.stringify({
          type: "KEYDOWN",
          key: code,
          playerType: this.playerType,
        })
      );
    } else {
      ws.send(
        JSON.stringify({
          type: "KEYUP",
          key: code,
          playerType: this.playerType,
        })
      );
    }
  }

  listenToEvents(ws: WebSocket, playerType: string) {
    this.playerType = playerType;

    this.onKeyDown = (event: KeyboardEvent) => {
      this.handleEvent(event, ws);
    };
    this.onKeyUp = (event: KeyboardEvent) => {
      this.handleEvent(event, ws);
    };

    window.addEventListener("keydown", this.onKeyDown);

    window.addEventListener("keyup", this.onKeyUp);
  }

  clearListeners() {
    this.playerType = null;

    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
