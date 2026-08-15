import type { FrameCanvasContext, Rect } from "../frames/types";
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

/**
 * The caption's bounding box, centred on (positionX%, positionY%) of the
 * canvas — the only positioning mechanism. This is deliberately independent
 * of the frame's layout (border/image rects): the caption is a pure overlay
 * painted on top of the finished frame, so resizing it or moving it never
 * changes the canvas or shrinks the photo.
 */
export function captionBox(
  canvasWidth: number,
  canvasHeight: number,
  caption: Caption,
  metrics: CaptionMetrics,
  scale: number,
): Rect {
  const blockHeight = metrics.blockHeight * scale;
  // Text alignment shifts text within this box, not the box itself — so
  // dragging always moves the caption's visual centre, regardless of align.
  const blockWidth = metrics.maxLineWidth * scale + metrics.padding * scale * 2;
  const centerX = canvasWidth * (caption.positionX / 100);
  const centerY = canvasHeight * (caption.positionY / 100);

  return {
    x: centerX - blockWidth / 2,
    y: centerY - blockHeight / 2,
    width: blockWidth,
    height: blockHeight,
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

  if (caption.backgroundEnabled && caption.backgroundOpacity > 0) {
    ctx.fillStyle = hexToRgba(
      caption.backgroundColor,
      caption.backgroundOpacity,
    );
    ctx.fillRect(box.x, top - padding / 2, box.width, textHeight + padding);
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
