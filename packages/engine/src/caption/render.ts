import type { FrameCanvasContext, FrameLayout, Rect } from "../frames/types";
import type { Caption } from "../recipe/schema";
import { captionText, fontString, type CaptionMetrics } from "./layout";

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const num = Number.parseInt(value, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The band of canvas the caption is placed within, before offsetting. */
export function captionBox(
  layout: FrameLayout,
  caption: Caption,
  metrics: CaptionMetrics,
  scale: number,
): Rect {
  const blockHeight = metrics.blockHeight * scale;
  const imageBottom = layout.image.y + layout.image.height;

  switch (caption.anchor) {
    case "free": {
      // Centred on (positionX%, positionY%) of the whole canvas, regardless
      // of text alignment — dragging the caption always moves its visual
      // centre, and left/right align only shifts text within that box.
      const blockWidth = metrics.maxLineWidth * scale + metrics.padding * scale * 2;
      const centerX = layout.canvas.width * (caption.positionX / 100);
      const centerY = layout.canvas.height * (caption.positionY / 100);
      return {
        x: centerX - blockWidth / 2,
        y: centerY - blockHeight / 2,
        width: blockWidth,
        height: blockHeight,
      };
    }
    case "border-top":
      return {
        x: layout.framed.x,
        y: layout.framed.y,
        width: layout.framed.width,
        height: Math.max(layout.padding.top, blockHeight),
      };
    case "image-top":
      return {
        x: layout.image.x,
        y: layout.image.y,
        width: layout.image.width,
        height: blockHeight,
      };
    case "image-bottom":
      return {
        x: layout.image.x,
        y: imageBottom - blockHeight,
        width: layout.image.width,
        height: blockHeight,
      };
    case "border-bottom":
    default:
      return {
        x: layout.framed.x,
        y: imageBottom,
        width: layout.framed.width,
        height: Math.max(layout.padding.bottom, blockHeight),
      };
  }
}

export function drawCaption(
  ctx: FrameCanvasContext,
  layout: FrameLayout,
  caption: Caption,
  metrics: CaptionMetrics,
  scale: number,
  sourceShortEdge: number,
): void {
  if (metrics.lines.length === 0) return;

  const box = captionBox(layout, caption, metrics, scale);
  const fontSize = metrics.fontSize * scale;
  const lineHeight = metrics.lineHeight * scale;
  const padding = metrics.padding * scale;
  const offset = (caption.offsetPct / 100) * sourceShortEdge * scale;

  const textHeight = metrics.lines.length * lineHeight;
  const top = box.y + (box.height - textHeight) / 2 + offset;

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

  if (caption.backgroundEnabled && caption.backgroundOpacity > 0) {
    const widest = metrics.maxLineWidth * scale;
    // For the "free" anchor, box.width already equals widest + padding*2 —
    // this just reuses that box exactly rather than special-casing it.
    const chipWidth = Math.min(widest + padding * 2, box.width);
    const chipX =
      caption.align === "left"
        ? box.x + padding / 2
        : caption.align === "right"
          ? box.x + box.width - chipWidth - padding / 2
          : box.x + (box.width - chipWidth) / 2;

    ctx.fillStyle = hexToRgba(
      caption.backgroundColor,
      caption.backgroundOpacity,
    );
    ctx.fillRect(
      chipX,
      top - padding / 2,
      chipWidth,
      textHeight + padding,
    );
  }

  if (caption.shadowEnabled && caption.shadowOpacity > 0) {
    ctx.shadowColor = `rgba(0, 0, 0, ${caption.shadowOpacity})`;
    ctx.shadowBlur = fontSize * 0.25;
    ctx.shadowOffsetY = fontSize * 0.06;
  }

  ctx.fillStyle = hexToRgba(caption.color, caption.opacity);
  metrics.lines.forEach((line, index) => {
    ctx.fillText(line, x, top + index * lineHeight + lineHeight / 2);
  });

  ctx.restore();
}

export { captionText };
