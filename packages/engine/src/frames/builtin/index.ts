import { listFrames, registerFrame } from "../registry";
import { aspectPadFrame, noneFrame, solidFrame } from "./simple";
import { matFrame } from "./mat";
import { polaroidFrame } from "./polaroid";
import { filmFrame } from "./film";

export function registerBuiltinFrames(): void {
  if (listFrames().length > 0) return;
  registerFrame(noneFrame);
  registerFrame(solidFrame);
  registerFrame(matFrame);
  registerFrame(polaroidFrame);
  registerFrame(filmFrame);
  registerFrame(aspectPadFrame);
}
