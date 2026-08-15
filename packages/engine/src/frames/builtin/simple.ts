import { borderUnit, type FrameDefinition } from "../types";

/** No border at all. Aspect-ratio padding, if any, still applies. */
export const noneFrame: FrameDefinition = {
  id: "none",
  label: "None",
  padding: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
};

/** An even border on all four sides — the classic print margin. */
export const solidFrame: FrameDefinition = {
  id: "solid",
  label: "Solid",
  padding: (border, width, height) => {
    const t = border.widthPct * borderUnit(width, height);
    return { top: t, right: t, bottom: t, left: t };
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

/**
 * Adds no border of its own — the canvas is padded out to the target aspect
 * ratio and nothing more. This is the one to use for "make it square for
 * Instagram without a visible frame".
 */
export const aspectPadFrame: FrameDefinition = {
  id: "aspect-pad",
  label: "Pad",
  padding: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  captionArea: (layout) => {
    const below = layout.canvas.height - (layout.image.y + layout.image.height);
    return below <= 0
      ? null
      : {
          x: 0,
          y: layout.image.y + layout.image.height,
          width: layout.canvas.width,
          height: below,
        };
  },
};
