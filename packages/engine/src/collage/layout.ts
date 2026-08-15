import { aspectValue, borderUnit } from "../frames/types";
import type { AspectRatio } from "../recipe/schema";
import type { Collage } from "./schema";

export interface Size {
  width: number;
  height: number;
}

export interface CollageCellRect {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollageLayout {
  canvas: Size;
  /** Row-major, length rows * cols. */
  cells: CollageCellRect[];
  borderWidth: number;
  gap: number;
  cellRadius: number;
}

/** Canvas pixel size for a chosen aspect + target long edge. There's no
 *  single "original" photo for a collage to inherit an aspect from, so a
 *  ratio-less aspect falls back to the grid's own cols/rows shape. */
export function collageCanvasSize(
  aspect: AspectRatio,
  rows: number,
  cols: number,
  longEdge: number,
): Size {
  const ratio = aspectValue(aspect) ?? cols / rows;
  return ratio >= 1
    ? { width: Math.round(longEdge), height: Math.round(longEdge / ratio) }
    : { width: Math.round(longEdge * ratio), height: Math.round(longEdge) };
}

/**
 * Pure grid math — the collage analogue of computeFrameLayout(). Given a
 * resolved canvas size, computes every cell's rect plus the border/gap/
 * radius in pixels. Doesn't touch a canvas, so it's cheap to unit test.
 */
export function computeCollageLayout(
  collage: Collage,
  canvasWidth: number,
  canvasHeight: number,
): CollageLayout {
  const { rows, cols, gapPct, borderWidthPct, radiusPct } = collage;
  const unit = borderUnit(canvasWidth, canvasHeight);
  const borderWidth = borderWidthPct * unit;
  const gap = gapPct * unit;
  const cellRadius = radiusPct * unit;

  const innerWidth = Math.max(0, canvasWidth - borderWidth * 2);
  const innerHeight = Math.max(0, canvasHeight - borderWidth * 2);
  const cellWidth = Math.max(0, (innerWidth - gap * (cols - 1)) / cols);
  const cellHeight = Math.max(0, (innerHeight - gap * (rows - 1)) / rows);

  const cells: CollageCellRect[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        row,
        col,
        x: borderWidth + col * (cellWidth + gap),
        y: borderWidth + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
      });
    }
  }

  return {
    canvas: { width: canvasWidth, height: canvasHeight },
    cells,
    borderWidth,
    gap,
    cellRadius,
  };
}

export interface CoverFit {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

/** CSS background-size:cover math — crops a source rect so it fills the
 *  target box without distorting it. */
export function coverFit(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverFit {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    const sHeight = sourceHeight;
    const sWidth = sHeight * targetAspect;
    return { sx: (sourceWidth - sWidth) / 2, sy: 0, sWidth, sHeight };
  }

  const sWidth = sourceWidth;
  const sHeight = sWidth / targetAspect;
  return { sx: 0, sy: (sourceHeight - sHeight) / 2, sWidth, sHeight };
}
