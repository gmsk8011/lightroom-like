import { measureCaption } from "../caption/layout";
import { drawCaption } from "../caption/render";
import { registerBuiltinFrames } from "../frames/builtin";
import { roundedRectPath } from "../frames/draw";
import {
  computeFrameLayout,
  getFrame,
  resolvePadding,
  scaleLayout,
} from "../frames/registry";
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
 * Draws the final image: background, frame, photo, frame details.
 *
 * Preview and export both come through here — the only difference is `scale`,
 * which is what keeps what you see and what you get identical.
 */
export function composite(input: CompositeInput): FrameLayout {
  const { ctx, source, sourceWidth, sourceHeight, recipe } = input;
  const scale = input.scale ?? 1;
  const { border } = recipe;

  registerBuiltinFrames();

  const metrics = measureCaption(ctx, recipe.caption, sourceWidth, sourceHeight);

  // A caption anchored in the border may need more room than the frame gives
  // it. Padding is resolved first so the shortfall — and only the shortfall —
  // is added, which keeps a polaroid's chin from growing for no reason.
  let extraTop = 0;
  let extraBottom = 0;
  if (metrics) {
    const base = resolvePadding(border, sourceWidth, sourceHeight);
    if (recipe.caption.anchor === "border-bottom") {
      extraBottom = Math.max(0, metrics.blockHeight - base.bottom);
    } else if (recipe.caption.anchor === "border-top") {
      extraTop = Math.max(0, metrics.blockHeight - base.top);
    }
  }

  const full = computeFrameLayout(
    border,
    sourceWidth,
    sourceHeight,
    extraBottom,
    extraTop,
  );
  const layout = scale === 1 ? full : scaleLayout(full, scale);

  const canvas = ctx.canvas;
  canvas.width = layout.canvas.width;
  canvas.height = layout.canvas.height;

  const unit = borderUnit(sourceWidth, sourceHeight) * scale;
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

  ctx.drawImage(
    source,
    layout.image.x,
    layout.image.y,
    layout.image.width,
    layout.image.height,
  );
  ctx.restore();

  frame?.drawOver?.(ctx, layout, border);

  if (metrics) {
    drawCaption(
      ctx,
      layout,
      recipe.caption,
      metrics,
      scale,
      Math.min(sourceWidth, sourceHeight),
    );
  }

  return layout;
}
