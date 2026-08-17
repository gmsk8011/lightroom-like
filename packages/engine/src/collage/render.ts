import type { FrameCanvasContext } from "../frames/types";
import { roundedRectPath } from "../frames/draw";
import { computeCollageLayout, coverFitTransform, type CollageLayout } from "./layout";
import type { Collage } from "./schema";

export interface CollageSource {
  image: CanvasImageSource;
  width: number;
  height: number;
}

export interface CollageRenderInput {
  ctx: FrameCanvasContext;
  collage: Collage;
  canvasWidth: number;
  canvasHeight: number;
  /** Row-major, length rows * cols. Each source is already whatever it
   *  needs to be (filtered or not) — this function only draws, no GPU work
   *  and no decoding happens here. */
  sources: (CollageSource | null)[];
}

/**
 * The collage analogue of compositor.ts's composite() — the single shared
 * draw path for both the live preview and export, so what you see is what
 * you get. Can't reuse composite() itself: it unconditionally resizes and
 * clears the whole destination canvas for one photo's own layout, so it has
 * no way to draw into a sub-rect of a canvas shared by many photos.
 */
export function renderCollage(input: CollageRenderInput): CollageLayout {
  const { ctx, collage, canvasWidth, canvasHeight, sources } = input;
  const canvas = ctx.canvas;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const layout = computeCollageLayout(collage, canvasWidth, canvasHeight);

  ctx.fillStyle = collage.borderColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  for (const cell of layout.cells) {
    const index = cell.row * collage.cols + cell.col;
    const source = sources[index] ?? null;
    const cellData = collage.cells[index];

    ctx.save();
    if (layout.cellRadius > 0) {
      roundedRectPath(ctx, cell, layout.cellRadius);
      ctx.clip();
    }

    if (source && cellData && cell.width > 0 && cell.height > 0) {
      const fit = coverFitTransform(
        source.width,
        source.height,
        cell.width,
        cell.height,
        cellData.offsetX,
        cellData.offsetY,
        cellData.zoom,
      );
      ctx.drawImage(
        source.image,
        fit.sx,
        fit.sy,
        fit.sWidth,
        fit.sHeight,
        cell.x,
        cell.y,
        cell.width,
        cell.height,
      );
    } else {
      ctx.fillStyle = collage.gapColor;
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    }
    ctx.restore();
  }

  return layout;
}
