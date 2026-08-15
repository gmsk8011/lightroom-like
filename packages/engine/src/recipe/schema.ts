import { z } from "zod";

/**
 * A recipe is the complete, serializable description of one photo's edit.
 * Nothing in the pipeline mutates pixels outside of what a recipe describes,
 * which is what makes bulk-apply, presets, undo and copy/paste all reduce to
 * moving one JSON object around.
 */

export const FRAME_TYPES = [
  "none",
  "solid",
  "mat",
  "polaroid",
  "film",
  "aspect-pad",
] as const;
export type FrameType = (typeof FRAME_TYPES)[number];

export const ASPECT_RATIOS = [
  "original",
  "1:1",
  "4:5",
  "5:4",
  "3:2",
  "2:3",
  "16:9",
  "9:16",
] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected a #rrggbb colour");

export const filtersSchema = z.object({
  exposure: z.number().min(-5).max(5),
  contrast: z.number().min(-100).max(100),
  highlights: z.number().min(-100).max(100),
  shadows: z.number().min(-100).max(100),
  whites: z.number().min(-100).max(100),
  blacks: z.number().min(-100).max(100),
  temperature: z.number().min(-100).max(100),
  tint: z.number().min(-100).max(100),
  vibrance: z.number().min(-100).max(100),
  saturation: z.number().min(-100).max(100),
  clarity: z.number().min(-100).max(100),
  grain: z.number().min(0).max(100),
  vignette: z.number().min(-100).max(100),
  /** id of the preset this was seeded from, purely for UI display */
  preset: z.string().nullable(),
});
export type Filters = z.infer<typeof filtersSchema>;

export const borderSchema = z.object({
  type: z.enum(FRAME_TYPES),
  /** Percent of the image's short edge, so borders scale with photo size. */
  widthPct: z.number().min(0).max(40),
  color: hexColor,
  aspect: z.enum(ASPECT_RATIOS),
  radiusPct: z.number().min(0).max(20),
  /** Inner accent line, used by the mat frame. */
  lineWidthPct: z.number().min(0).max(3),
  lineColor: hexColor,
  shadowSizePct: z.number().min(0).max(10),
  shadowOpacity: z.number().min(0).max(1),
});
export type Border = z.infer<typeof borderSchema>;

export const captionSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(500),
  fontFamily: z.string(),
  fontWeight: z.number().int().min(100).max(900),
  /** Percent of the canvas short edge. */
  sizePct: z.number().min(0.5).max(15),
  color: hexColor,
  opacity: z.number().min(0).max(1),
  align: z.enum(["left", "center", "right"]),
  /** Centre point of the caption block, as a percent of the full canvas.
   *  This is the only positioning mechanism — the caption is always a free
   *  overlay, draggable on the preview, and never influences frame layout. */
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100),
  letterSpacing: z.number().min(-0.1).max(1),
  uppercase: z.boolean(),
  shadowEnabled: z.boolean(),
  shadowOpacity: z.number().min(0).max(1),
  backgroundEnabled: z.boolean(),
  backgroundColor: hexColor,
  backgroundOpacity: z.number().min(0).max(1),
});
export type Caption = z.infer<typeof captionSchema>;

export const editRecipeSchema = z.object({
  version: z.literal(1),
  filters: filtersSchema,
  border: borderSchema,
  caption: captionSchema,
});
export type EditRecipe = z.infer<typeof editRecipeSchema>;
