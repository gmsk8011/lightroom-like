import type { AspectRatio, Border, FrameType } from "../recipe/schema";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface FramePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FrameLayout {
  /** Final output dimensions in pixels. */
  canvas: Size;
  /** Where the photo itself goes. */
  image: Rect;
  /** The photo plus its border, before any aspect-ratio padding. */
  framed: Rect;
  padding: FramePadding;
  /** Scale from source pixels to canvas pixels — always 1 for export. */
  scale: number;
}

export type FrameCanvasContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export interface FrameDefinition {
  id: FrameType;
  label: string;
  /**
   * Border thickness on each side, in source pixels. Pure — no canvas, no
   * globals — which is what makes frame geometry unit-testable without a GPU.
   */
  padding(border: Border, sourceWidth: number, sourceHeight: number): FramePadding;
  /** Painted before the photo: background, mats, film base. */
  draw?(
    ctx: FrameCanvasContext,
    layout: FrameLayout,
    border: Border,
  ): void;
  /** Painted after the photo: sprocket holes, inner rules, edge details. */
  drawOver?(
    ctx: FrameCanvasContext,
    layout: FrameLayout,
    border: Border,
  ): void;
  /**
   * Space this frame naturally offers for a caption, in canvas coordinates.
   * Returning null means a caption has to make its own room.
   */
  captionArea?(layout: FrameLayout, border: Border): Rect | null;
}

const ASPECT_VALUES: Record<Exclude<AspectRatio, "original">, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "5:4": 5 / 4,
  "3:2": 3 / 2,
  "2:3": 2 / 3,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1.91:1": 1.91,
};

export function aspectValue(aspect: AspectRatio): number | null {
  return aspect === "original" ? null : ASPECT_VALUES[aspect];
}

/** Border sizes are a percentage of the short edge so they look the same on
 *  every photo regardless of resolution or orientation. */
export function borderUnit(sourceWidth: number, sourceHeight: number): number {
  return Math.min(sourceWidth, sourceHeight) / 100;
}
