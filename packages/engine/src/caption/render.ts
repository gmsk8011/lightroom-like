import type { FrameCanvasContext, Rect } from "../frames/types";
import type { Caption } from "../recipe/schema";
import { captionText, fontString, type CaptionMetrics } from "./layout";

/** `letterSpacing` is on both 2D context types but TS's DOM lib doesn't
 *  share a common interface for it, so reading/writing across the
 *  CanvasRenderingContext2D / OffscreenCanvasRenderingContext2D split needs
 *  a narrow structural type rather than casting between the two directly. */
interface WithLetterSpacing {
  letterSpacing: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const num = Number.parseInt(value, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The caption's bounding box, centred on (positionX%, positionY%) of the
 * canvas — the only positioning mechanism. This is deliberately independent
 * of the frame's layout (border/image rects): the caption is a pure overlay
 * painted on top of the finished frame, so resizing it or moving it never
 * changes the canvas or shrinks the photo.
 *
 * boxWidthPct/boxHeightPct are an absolute size, not a floor: at 0 (the
 * default) the box tightly fits the text. A non-zero value sets the box to
 * exactly that size — bigger than the text's auto-fit size adds margin,
 * smaller crops it (drawCaption clips to this rect so cropped text is cut
 * cleanly rather than spilling past the box).
 */
export function captionBox(
  canvasWidth: number,
  canvasHeight: number,
  caption: Caption,
  metrics: CaptionMetrics,
  scale: number,
): Rect {
  const autoHeight = metrics.blockHeight * scale;
  // Text alignment shifts text within this box, not the box itself — so
  // dragging always moves the caption's visual centre, regardless of align.
  const autoWidth = metrics.maxLineWidth * scale + metrics.padding * scale * 2;

  const width =
    caption.boxWidthPct > 0 ? canvasWidth * (caption.boxWidthPct / 100) : autoWidth;
  const height =
    caption.boxHeightPct > 0 ? canvasHeight * (caption.boxHeightPct / 100) : autoHeight;

  const centerX = canvasWidth * (caption.positionX / 100);
  const centerY = canvasHeight * (caption.positionY / 100);

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

export function drawCaption(
  ctx: FrameCanvasContext,
  canvasWidth: number,
  canvasHeight: number,
  caption: Caption,
  metrics: CaptionMetrics,
  scale: number,
): void {
  if (metrics.lines.length === 0) return;

  const box = captionBox(canvasWidth, canvasHeight, caption, metrics, scale);
  const fontSize = metrics.fontSize * scale;
  const lineHeight = metrics.lineHeight * scale;
  const padding = metrics.padding * scale;

  const textHeight = metrics.lines.length * lineHeight;
  // Text is centred within the box on both axes — when the box is grown
  // past its auto-fit size (via boxWidthPct/boxHeightPct), the extra room
  // appears as even space around the text rather than shifting it off-centre.
  const top = box.y + (box.height - textHeight) / 2;

  const x =
    caption.align === "left"
      ? box.x + padding
      : caption.align === "right"
        ? box.x + box.width - padding
        : box.x + box.width / 2;

  ctx.save();
  ctx.font = fontString(caption, fontSize);
  ctx.textAlign = caption.align;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D).letterSpacing =
      `${metrics.letterSpacing * scale}px`;
  }

  if (caption.style === "knockout") {
    // destination-out erases whatever is already painted on the surface
    // it's called on. Doing that directly on the main canvas would erase
    // into nothing, because the photo pixels under the box were already
    // overwritten by the box's own fill — there's no photo "layer" left to
    // reveal there. Compositing the box+cutout in a separate buffer first,
    // then drawing that buffer onto the main canvas normally, means the
    // holes reveal whatever the main canvas already has underneath — the
    // photo — instead of revealing nothing.
    const maskWidth = Math.max(1, Math.ceil(box.width));
    const maskHeight = Math.max(1, Math.ceil(box.height));
    const mask = new OffscreenCanvas(maskWidth, maskHeight);
    const maskCtx = mask.getContext("2d");

    if (maskCtx) {
      maskCtx.font = ctx.font;
      maskCtx.textAlign = ctx.textAlign;
      maskCtx.textBaseline = ctx.textBaseline;
      if ("letterSpacing" in maskCtx) {
        (maskCtx as unknown as WithLetterSpacing).letterSpacing =
          (ctx as unknown as WithLetterSpacing).letterSpacing;
      }

      maskCtx.fillStyle = hexToRgba(caption.backgroundColor, caption.backgroundOpacity);
      maskCtx.fillRect(0, 0, maskWidth, maskHeight);

      // Alpha is all that matters for destination-out — the fill colour is
      // arbitrary. This punches the letter shapes out of the box just
      // painted, within the isolated mask buffer.
      maskCtx.globalCompositeOperation = "destination-out";
      maskCtx.fillStyle = `rgba(0, 0, 0, ${caption.opacity})`;
      const localX = x - box.x;
      const localTop = top - box.y;
      metrics.lines.forEach((line, index) => {
        maskCtx.fillText(line, localX, localTop + index * lineHeight + lineHeight / 2);
      });

      ctx.drawImage(mask, box.x, box.y);
    }

    ctx.restore();
    return;
  }

  // Every other style draws straight onto the main canvas rather than an
  // isolated buffer, so a manually-shrunk box (boxWidthPct/boxHeightPct
  // below the text's auto-fit size) needs an explicit clip to crop the
  // text cleanly instead of letting it spill past the box.
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();

  if (caption.style === "frosted") {
    // A soft, low-contrast "engraved" look: two blurred, offset copies of
    // the text — a light one shifted up-left and a dark one shifted
    // down-right — read as a subtle emboss/frost over the photo rather
    // than legible solid text. No box, no fill colour: caption.opacity is
    // the only strength control.
    const blur = fontSize * 0.05;
    const offset = fontSize * 0.025;
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = hexToRgba("#ffffff", caption.opacity * 0.45);
    metrics.lines.forEach((line, index) => {
      ctx.fillText(
        line,
        x - offset,
        top + index * lineHeight + lineHeight / 2 - offset,
      );
    });
    ctx.fillStyle = hexToRgba("#000000", caption.opacity * 0.55);
    metrics.lines.forEach((line, index) => {
      ctx.fillText(
        line,
        x + offset,
        top + index * lineHeight + lineHeight / 2 + offset,
      );
    });
    ctx.filter = "none";
    ctx.restore();
    return;
  }

  if (
    caption.style !== "hollow" &&
    caption.backgroundEnabled &&
    caption.backgroundOpacity > 0
  ) {
    ctx.fillStyle = hexToRgba(caption.backgroundColor, caption.backgroundOpacity);
    ctx.fillRect(box.x, box.y, box.width, box.height);
  }

  if (caption.shadowEnabled && caption.shadowOpacity > 0) {
    ctx.shadowColor = `rgba(0, 0, 0, ${caption.shadowOpacity})`;
    ctx.shadowBlur = fontSize * 0.25;
    ctx.shadowOffsetY = fontSize * 0.06;
  }

  if (
    (caption.style === "outline" || caption.style === "hollow") &&
    caption.borderWidthPct > 0
  ) {
    // Stroke first, fill on top: strokeText centres its line on the glyph
    // path, so the fill covers the inward half and leaves a clean outline
    // rather than a stroke that reads as blurring the letterform. Hollow
    // skips the fill entirely, so its stroke is drawn the same way but the
    // letter interior stays untouched, showing whatever is already
    // underneath (the photo, or a background box if enabled).
    ctx.strokeStyle = hexToRgba(caption.borderColor, caption.opacity);
    ctx.lineWidth = fontSize * (caption.borderWidthPct / 100);
    ctx.lineJoin = "round";
    metrics.lines.forEach((line, index) => {
      ctx.strokeText(line, x, top + index * lineHeight + lineHeight / 2);
    });
  }

  if (caption.style !== "hollow") {
    ctx.fillStyle = hexToRgba(caption.color, caption.opacity);
    metrics.lines.forEach((line, index) => {
      ctx.fillText(line, x, top + index * lineHeight + lineHeight / 2);
    });
  }

  ctx.restore();
}

export { captionText };
