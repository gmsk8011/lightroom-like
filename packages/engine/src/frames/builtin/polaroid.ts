import { borderUnit, type FrameDefinition } from "../types";

/** Instant-film proportions: even margin on three sides, deep chin below. */
const CHIN_RATIO = 3.2;

export const polaroidFrame: FrameDefinition = {
  id: "polaroid",
  label: "Polaroid",
  padding: (border, width, height) => {
    const t = border.widthPct * borderUnit(width, height);
    return { top: t, right: t, bottom: t * CHIN_RATIO, left: t };
  },

  // The chin is where the caption belongs — that is what it exists for.
  captionArea: (layout) => ({
    x: layout.framed.x,
    y: layout.image.y + layout.image.height,
    width: layout.framed.width,
    height: layout.padding.bottom,
  }),
};
