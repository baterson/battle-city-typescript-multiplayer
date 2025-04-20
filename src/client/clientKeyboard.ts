import { ControlKeys } from "./types";

export class ClientKeyboard {
  handleEvent(event: KeyboardEvent, ws: WebSocket) {
    const { code, type } = event;

    if (!ControlKeys[code]) return;

    if (type === "keydown") {
      console.log("Hello");

      ws.send(JSON.stringify({ type: "KEYDOWN", key: code }));
    } else {
      ws.send(JSON.stringify({ type: "KEYUP", key: code }));
    }
  }

  listenToEvents(ws: WebSocket) {
    ["keydown", "keyup"].forEach((eventName) => {
      window.addEventListener(eventName, (event: KeyboardEvent) => {
        this.handleEvent(event, ws);
      });
    });
  }
}
