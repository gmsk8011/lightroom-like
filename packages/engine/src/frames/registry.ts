import type { Border, FrameType } from "../recipe/schema";
import {
  aspectValue,
  type FrameDefinition,
  type FrameLayout,
  type FramePadding,
} from "./types";

const registry = new Map<FrameType, FrameDefinition>();

export function registerFrame(definition: FrameDefinition): void {
  registry.set(definition.id, definition);
}

export function getFrame(id: FrameType): FrameDefinition | undefined {
  return registry.get(id);
}

export function listFrames(): FrameDefinition[] {
  return [...registry.values()];
}

const NO_PADDING: FramePadding = { top: 0, right: 0, bottom: 0, left: 0 };

/** The frame's own padding, before aspect-ratio work. */
export function resolvePadding(
  border: Border,
  sourceWidth: number,
  sourceHeight: number,
  extraBottom = 0,
  extraTop = 0,
): FramePadding {
  const definition = registry.get(border.type);
  const base =
    definition?.padding(border, sourceWidth, sourceHeight) ?? NO_PADDING;

  return {
    top: Math.round(base.top + extraTop),
    right: Math.round(base.right),
    bottom: Math.round(base.bottom + extraBottom),
    left: Math.round(base.left),
  };
}

/**
 * Resolves a border spec into concrete geometry.
 *
 * The order matters: the frame's own padding wraps the photo first, and only
 * then is the whole thing padded out to the requested aspect ratio. That way
 * "square with a white border" keeps an even border and a truly square canvas,
 * rather than a border that grows on two sides.
 *
 * `extraBottom` and `extraTop` let a caption reserve room the frame didn't
 * already provide.
 */
export function computeFrameLayout(
  border: Border,
  sourceWidth: number,
  sourceHeight: number,
  extraBottom = 0,
  extraTop = 0,
): FrameLayout {
  const padding = resolvePadding(border, sourceWidth, sourceHeight, extraBottom, extraTop);

  const framedWidth = sourceWidth + padding.left + padding.right;
  const framedHeight = sourceHeight + padding.top + padding.bottom;

  let canvasWidth = framedWidth;
  let canvasHeight = framedHeight;

  const target = aspectValue(border.aspect);
  if (target !== null) {
    // Only ever grow, so aspect padding can never crop the photo.
    if (framedWidth / framedHeight < target) {
      canvasWidth = Math.round(framedHeight * target);
    } else {
      canvasHeight = Math.round(framedWidth / target);
    }
  }

  const offsetX = Math.round((canvasWidth - framedWidth) / 2);
  const offsetY = Math.round((canvasHeight - framedHeight) / 2);

  return {
    canvas: { width: canvasWidth, height: canvasHeight },
    framed: {
      x: offsetX,
      y: offsetY,
      width: framedWidth,
      height: framedHeight,
    },
    image: {
      x: offsetX + padding.left,
      y: offsetY + padding.top,
      width: sourceWidth,
      height: sourceHeight,
    },
    padding,
    scale: 1,
  };
}

/** Scales a layout computed at source resolution down to a preview size. */
export function scaleLayout(layout: FrameLayout, scale: number): FrameLayout {
  const round = (n: number) => Math.round(n * scale);
  return {
    canvas: {
      width: Math.max(1, round(layout.canvas.width)),
      height: Math.max(1, round(layout.canvas.height)),
    },
    framed: {
      x: round(layout.framed.x),
      y: round(layout.framed.y),
      width: round(layout.framed.width),
      height: round(layout.framed.height),
    },
    image: {
      x: round(layout.image.x),
      y: round(layout.image.y),
      width: Math.max(1, round(layout.image.width)),
      height: Math.max(1, round(layout.image.height)),
    },
    padding: {
      top: round(layout.padding.top),
      right: round(layout.padding.right),
      bottom: round(layout.padding.bottom),
      left: round(layout.padding.left),
    },
    scale,
  };
}
