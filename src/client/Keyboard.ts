import { ControlKeys } from "./types";

export class Keyboard {
  queue: Set<ControlKeys>;

  constructor() {
    this.queue = new Set();
  }

  handleMessage(message: any) {
    const { type, key } = message;
    if (type === "KEYDOWN") {
      this.queue.add(key);
    } else if (type === "KEYUP") {
      this.queue.delete(key);
    }
  }

  getKey() {
    return Array.from(this.queue).pop();
  }
}
