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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * coverFit() plus pan (offsetX/offsetY, -50..50, 0 = centred) and zoom
 * (>=1, crops in tighter). Room to pan exists on whichever axis coverFit()
 * itself already crops — a panorama in a square cell has horizontal slack
 * even at zoom 1, since only part of its width was ever going to show.
 * Zooming in shrinks the crop window on both axes, which can open up slack
 * on an axis that had none at zoom 1.
 *
 * offsetX/offsetY are stored as a percent of the *available* slack rather
 * than an absolute pixel shift, so they stay meaningful — and don't need
 * re-clamping — as zoom changes the amount of slack there is to use.
 */
export function coverFitTransform(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  offsetXPct: number,
  offsetYPct: number,
  zoom: number,
): CoverFit {
  const base = coverFit(sourceWidth, sourceHeight, targetWidth, targetHeight);
  const sWidth = base.sWidth / zoom;
  const sHeight = base.sHeight / zoom;
  const slackX = Math.max(0, sourceWidth - sWidth);
  const slackY = Math.max(0, sourceHeight - sHeight);

  const sx = clamp(((offsetXPct + 50) / 100) * slackX, 0, slackX);
  const sy = clamp(((offsetYPct + 50) / 100) * slackY, 0, slackY);

  return { sx, sy, sWidth, sHeight };
}
