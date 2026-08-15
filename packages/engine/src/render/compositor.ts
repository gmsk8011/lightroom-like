import { measureCaption } from "../caption/layout";
import { drawCaption } from "../caption/render";
import { registerBuiltinFrames } from "../frames/builtin";
import { roundedRectPath } from "../frames/draw";
import { computeFrameLayout, getFrame, scaleLayout } from "../frames/registry";
import { borderUnit, type FrameCanvasContext, type FrameLayout } from "../frames/types";
import type { EditRecipe } from "../recipe/schema";

export interface CompositeInput {
  ctx: FrameCanvasContext;
  /** Usually the WebGL canvas holding the filtered photo. */
  source: CanvasImageSource;
  sourceWidth: number;
  sourceHeight: number;
  recipe: EditRecipe;
  /** 1 for export; below 1 for a preview that fits the viewport. */
  scale?: number;
}

/**
 * Draws the final image: background, frame, photo, frame details, captions.
 *
 * Preview and export both come through here — the only difference is `scale`,
 * which is what keeps what you see and what you get identical.
 */
export function composite(input: CompositeInput): FrameLayout {
  const { ctx, source, sourceWidth, sourceHeight, recipe } = input;
  const scale = input.scale ?? 1;
  const { border, crop } = recipe;

  registerBuiltinFrames();

  // A crop is applied before everything else: the cropped region is treated
  // as "the photo" for aspect-pad, border sizing and caption placement, all
  // of which key off these dimensions rather than the original ones.
  const cropX = crop ? crop.x : 0;
  const cropY = crop ? crop.y : 0;
  const cropWidthPct = crop ? crop.width : 100;
  const cropHeightPct = crop ? crop.height : 100;
  const photoWidth = sourceWidth * (cropWidthPct / 100);
  const photoHeight = sourceHeight * (cropHeightPct / 100);

  const full = computeFrameLayout(border, photoWidth, photoHeight);
  const layout = scale === 1 ? full : scaleLayout(full, scale);

  const canvas = ctx.canvas;
  canvas.width = layout.canvas.width;
  canvas.height = layout.canvas.height;

  const unit = borderUnit(photoWidth, photoHeight) * scale;
  const radius = border.radiusPct * unit;

  ctx.clearRect(0, 0, layout.canvas.width, layout.canvas.height);

  const hasBackground =
    border.type !== "none" ||
    layout.canvas.width !== layout.image.width ||
    layout.canvas.height !== layout.image.height;

  if (hasBackground) {
    ctx.fillStyle = border.color;
    ctx.fillRect(0, 0, layout.canvas.width, layout.canvas.height);
  }

  const frame = getFrame(border.type);
  frame?.draw?.(ctx, layout, border);

  ctx.save();

  if (border.shadowSizePct > 0 && border.shadowOpacity > 0) {
    ctx.shadowColor = `rgba(0, 0, 0, ${border.shadowOpacity})`;
    ctx.shadowBlur = border.shadowSizePct * unit;
    ctx.shadowOffsetY = border.shadowSizePct * unit * 0.35;
  }

  if (radius > 0) {
    // Filling the path first lays down the shadow; the photo is then clipped
    // into the same shape. Drawing the image with a shadow directly would
    // cast it from the image's square bounds, not its rounded corners.
    ctx.fillStyle = border.color;
    roundedRectPath(ctx, layout.image, radius);
    ctx.fill();
    ctx.shadowColor = "transparent";
    roundedRectPath(ctx, layout.image, radius);
    ctx.clip();
  }

  // `source`'s own pixel dimensions track sourceWidth/sourceHeight at
  // `scale` in every caller (the WebGL canvas is sized that way, and the
  // no-filter export path uses the bitmap itself at scale 1) — so the crop
  // rect converts into source-pixel coordinates with the same scale factor,
  // without needing to read the source's real width/height directly.
  const sourceRealWidth = sourceWidth * scale;
  const sourceRealHeight = sourceHeight * scale;
  let rotatedSource: CanvasImageSource = source;

  const rotation = crop?.rotation ?? 0;
  if (rotation !== 0) {
    // Straightening rotates the whole photo about its own centre before the
    // crop rect is cut from it, into a same-size scratch canvas — a corner
    // that rotates past the frame just leaves that corner showing the
    // border colour once cropped, same as any straighten tool.
    const rotated = new OffscreenCanvas(
      Math.max(1, Math.round(sourceRealWidth)),
      Math.max(1, Math.round(sourceRealHeight)),
    );
    const rotatedCtx = rotated.getContext("2d");
    if (rotatedCtx) {
      rotatedCtx.translate(sourceRealWidth / 2, sourceRealHeight / 2);
      rotatedCtx.rotate((rotation * Math.PI) / 180);
      rotatedCtx.drawImage(
        source,
        -sourceRealWidth / 2,
        -sourceRealHeight / 2,
        sourceRealWidth,
        sourceRealHeight,
      );
      rotatedSource = rotated;
    }
  }

  const sx = sourceWidth * (cropX / 100) * scale;
  const sy = sourceHeight * (cropY / 100) * scale;
  const sWidth = photoWidth * scale;
  const sHeight = photoHeight * scale;

  ctx.drawImage(
    rotatedSource,
    sx,
    sy,
    sWidth,
    sHeight,
    layout.image.x,
    layout.image.y,
    layout.image.width,
    layout.image.height,
  );
  ctx.restore();

  frame?.drawOver?.(ctx, layout, border);

  for (const caption of recipe.captions) {
    const metrics = measureCaption(ctx, caption, photoWidth, photoHeight);
    if (metrics) {
      drawCaption(ctx, layout.canvas.width, layout.canvas.height, caption, metrics, scale);
    }
  }

  return layout;
}
