import type { FrameCanvasContext, Rect } from "./types";

export function roundedRectPath(
  ctx: FrameCanvasContext,
  rect: Rect,
  radius: number,
): void {
  const r = Math.max(
    0,
    Math.min(radius, rect.width / 2, rect.height / 2),
  );
  ctx.beginPath();
  if (r === 0) {
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    return;
  }
  ctx.moveTo(rect.x + r, rect.y);
  ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, r);
  ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, r);
  ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, r);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, r);
  ctx.closePath();
}

export function fillRectStyled(
  ctx: FrameCanvasContext,
  rect: Rect,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}

/** Mixes a hex colour toward black or white — used for frame shading. */
export function shadeColor(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const num = Number.parseInt(value, 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const mix = (channel: number) =>
    Math.round(channel + (target - channel) * t);

  const r = mix((num >> 16) & 0xff);
  const g = mix((num >> 8) & 0xff);
  const b = mix(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
