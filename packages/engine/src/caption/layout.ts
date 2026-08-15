import type { FrameCanvasContext } from "../frames/types";
import type { Caption } from "../recipe/schema";

/**
 * Only system fonts are used. A webfont would have to finish loading before
 * export, and a font that renders differently in the export worker than in the
 * preview would silently change every caption — so the safe default wins.
 */
export const FONT_STACKS: Record<string, string> = {
  Inter: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  Georgia: 'Georgia, "Times New Roman", serif',
  "ui-monospace": 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  "Times New Roman": '"Times New Roman", Times, serif',
  Impact: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  "Courier New": '"Courier New", Courier, monospace',
  "ui-rounded": 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
  "Brush Script MT": '"Brush Script MT", "Segoe Script", cursive',
};

/** Display label for each font stack key, in menu order. */
export const FONT_LABELS: [key: string, label: string][] = [
  ["Inter", "Sans"],
  ["Georgia", "Serif"],
  ["ui-monospace", "Mono"],
  ["Times New Roman", "Classic"],
  ["Impact", "Display"],
  ["Courier New", "Typewriter"],
  ["ui-rounded", "Rounded"],
  ["Brush Script MT", "Script"],
];

export interface CaptionMetrics {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** Total height the caption needs, padding included. */
  blockHeight: number;
  /** Width of the widest line, unpadded — used for background chip sizing
   *  and for centering a free-positioned caption block. */
  maxLineWidth: number;
  padding: number;
  font: string;
  letterSpacing: number;
}

export function captionText(caption: Caption): string {
  const text = caption.text.trim();
  return caption.uppercase ? text.toUpperCase() : text;
}

export function hasCaption(caption: Caption): boolean {
  return caption.text.trim().length > 0;
}

export function fontString(caption: Caption, fontSize: number): string {
  const stack = FONT_STACKS[caption.fontFamily] ?? FONT_STACKS["Inter"];
  return `${caption.fontWeight} ${fontSize}px ${stack}`;
}

function wrap(
  ctx: FrameCanvasContext,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = words[0] ?? "";
    for (let i = 1; i < words.length; i += 1) {
      const word = words[i] ?? "";
      const candidate = `${line} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

/**
 * Measured in source pixels, never canvas pixels. Sizing the type off the
 * source means the caption stays the same size relative to the photo no
 * matter how much padding the frame or aspect ratio adds around it.
 */
export function measureCaption(
  ctx: FrameCanvasContext,
  caption: Caption,
  sourceWidth: number,
  sourceHeight: number,
): CaptionMetrics | null {
  if (!hasCaption(caption)) return null;

  const unit = Math.min(sourceWidth, sourceHeight);
  const fontSize = Math.max(1, (caption.sizePct / 100) * unit);
  const lineHeight = fontSize * 1.35;
  const padding = fontSize * 0.8;
  const font = fontString(caption, fontSize);
  const letterSpacing = caption.letterSpacing * fontSize;

  ctx.save();
  ctx.font = font;
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D).letterSpacing = `${letterSpacing}px`;
  }
  const lines = wrap(ctx, captionText(caption), sourceWidth - padding * 2);
  let maxLineWidth = 0;
  for (const line of lines) {
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
  }
  ctx.restore();

  return {
    lines,
    fontSize,
    lineHeight,
    padding,
    font,
    letterSpacing,
    maxLineWidth,
    blockHeight: lines.length * lineHeight + padding * 2,
  };
}
