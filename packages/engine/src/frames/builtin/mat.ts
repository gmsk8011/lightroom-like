import { roundedRectPath } from "../draw";
import { borderUnit, type FrameDefinition } from "../types";

/**
 * A gallery mat: a wide even border with a thin ruled line just outside the
 * photo, the way a cut mat board shows its bevel.
 */
export const matFrame: FrameDefinition = {
  id: "mat",
  label: "Mat",
  padding: (border, width, height) => {
    const t = border.widthPct * borderUnit(width, height);
    return { top: t, right: t, bottom: t, left: t };
  },

  drawOver: (ctx, layout, border) => {
    const unit = borderUnit(layout.image.width, layout.image.height);
    const lineWidth = border.lineWidthPct * unit * layout.scale;
    if (lineWidth <= 0) return;

    // Sits in the mat itself, one line-width out from the photo edge, so it
    // reads as part of the mount rather than an overlay on the picture.
    const gap = lineWidth * 2;
    const rect = {
      x: layout.image.x - gap - lineWidth / 2,
      y: layout.image.y - gap - lineWidth / 2,
      width: layout.image.width + (gap + lineWidth / 2) * 2,
      height: layout.image.height + (gap + lineWidth / 2) * 2,
    };

    ctx.save();
    ctx.strokeStyle = border.lineColor;
    ctx.lineWidth = lineWidth;
    roundedRectPath(ctx, rect, border.radiusPct * unit * layout.scale);
    ctx.stroke();
    ctx.restore();
  },

  captionArea: (layout) =>
    layout.padding.bottom <= 0
      ? null
      : {
          x: layout.framed.x,
          y: layout.image.y + layout.image.height,
          width: layout.framed.width,
          height: layout.padding.bottom,
        },
};
