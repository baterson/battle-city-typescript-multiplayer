import { ControlKeys } from "./types";

export class ClientKeyboard {
  handleEvent(event: KeyboardEvent, ws: WebSocket) {
    const { code, type } = event;

    if (!ControlKeys[code]) return;

    if (type === "keydown") {
      ws.send(JSON.stringify({ type: "KEYDOWN", key: code }));
    } else {
      ws.send(JSON.stringify({ type: "KEYUP", key: code }));
    }
  }

  listenToEvents(ws: WebSocket) {
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
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
