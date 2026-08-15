import { shadeColor } from "../draw";
import { borderUnit, type FrameDefinition } from "../types";

/**
 * A 35mm film strip: the border runs along the long edges as perforated
 * leader. Which edges get the perforations depends on orientation, so a
 * portrait photo gets them left and right rather than looking wrong.
 */
export const filmFrame: FrameDefinition = {
  id: "film",
  label: "Film",
  padding: (border, width, height) => {
    const t = border.widthPct * borderUnit(width, height);
    const landscape = width >= height;
    return landscape
      ? { top: t, right: t * 0.35, bottom: t, left: t * 0.35 }
      : { top: t * 0.35, right: t, bottom: t * 0.35, left: t };
  },

  draw: (ctx, layout, border) => {
    // Film base is dark regardless of the chosen border colour; the colour
    // control instead tints the perforations.
    ctx.fillStyle = shadeColor(border.color, -0.88);
    ctx.fillRect(
      layout.framed.x,
      layout.framed.y,
      layout.framed.width,
      layout.framed.height,
    );
  },

  drawOver: (ctx, layout, border) => {
    const landscape = layout.image.width >= layout.image.height;
    const band = landscape ? layout.padding.top : layout.padding.left;
    if (band <= 0) return;

    const holeLength = band * 0.62;
    const holeThickness = band * 0.42;
    const pitch = holeLength * 1.9;
    const radius = holeThickness * 0.28;

    ctx.save();
    ctx.fillStyle = shadeColor(border.color, -0.15);

    const drawHole = (x: number, y: number, w: number, h: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
    };

    if (landscape) {
      const inset = (band - holeThickness) / 2;
      const count = Math.floor(layout.framed.width / pitch);
      const margin = (layout.framed.width - count * pitch + (pitch - holeLength)) / 2;
      for (let i = 0; i < count; i += 1) {
        const x = layout.framed.x + margin + i * pitch;
        drawHole(x, layout.framed.y + inset, holeLength, holeThickness);
        drawHole(
          x,
          layout.framed.y + layout.framed.height - inset - holeThickness,
          holeLength,
          holeThickness,
        );
      }
    } else {
      const inset = (band - holeThickness) / 2;
      const count = Math.floor(layout.framed.height / pitch);
      const margin = (layout.framed.height - count * pitch + (pitch - holeLength)) / 2;
      for (let i = 0; i < count; i += 1) {
        const y = layout.framed.y + margin + i * pitch;
        drawHole(layout.framed.x + inset, y, holeThickness, holeLength);
        drawHole(
          layout.framed.x + layout.framed.width - inset - holeThickness,
          y,
          holeThickness,
          holeLength,
        );
      }
    }

    ctx.restore();
  },

  captionArea: () => null,
};
