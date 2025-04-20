import { Vector, VariableSprite } from "../types";

export function getAnimationIndex(
  animationLength: number,
  framesTotal: number,
  framesLeft: number
) {
  const step = framesTotal / animationLength;
  return Math.floor(framesLeft / step);
}
