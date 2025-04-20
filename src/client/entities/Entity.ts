import type { HeadlessGame } from "../HeadlessGame";
import { BoundingBox, Vector } from "../types";

/*
Base Entity. All entities derives from this class.
*/
export class Entity {
  type = "Entity";
  static numberGen: number = 0;
  id: number;
  position: Vector;
  size: Vector;

  constructor(position: Vector, size: Vector) {
    this.id = Entity.numberGen;
    this.position = position;
    this.size = size;
    Entity.numberGen += 1;
  }

  fromJSON(json) {
    if (!json) {
      return;
    }
    this.id = json.id;
    this.position = json.position;
    this.size = json.size;
  }

  toJSON() {
    return {
      id: this.id,
      position: this.position,
      size: this.size,
      type: this.type,
    };
  }

  /*
	Called every frame. Update entity state
	*/
  update(game: HeadlessGame) {}

  /*
	Called when possible by the game loop. Render entity sprites
	*/
  render() {}

  resolveEntityCollision(other) {}

  getBoundingBox(): BoundingBox {
    const { x, y } = this.position;
    const { x: width, y: height } = this.size;

    return {
      x1: x,
      x2: x + width,
      y1: y,
      y2: y + height,
    };
  }

  /*
	Called before entity deletes from the pool
	*/
  deconstruct() {}
}
