import { ControlKeys } from "./types";

export class Keyboard {
  queue: Set<ControlKeys>;
  secondQueue: Set<ControlKeys>;

  constructor() {
    this.queue = new Set();
    this.secondQueue = new Set();
  }

  handleMessage(message: any) {
    const { type, key, playerType } = message;
    console.log("handleMessage", type, key, playerType);

    let q = playerType === "Player" ? this.queue : this.secondQueue;

    if (type === "KEYDOWN") {
      console.log("Adding key, ", message);

      q.add(key);
    } else if (type === "KEYUP") {
      q.delete(key);
    }
  }

  getKey(playerType: string) {
    let q = playerType === "Player" ? this.queue : this.secondQueue;
    return Array.from(q).pop();
  }
}
