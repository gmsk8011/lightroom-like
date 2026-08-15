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
  // Instagram's feed landscape ratio — the one common size not already
  // covered by the generic ratios above (square, portrait, and story/reel
  // are 1:1, 4:5, and 9:16, which already exist).
  "1.91:1",
] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected a #rrggbb colour");

export const CAPTION_STYLES = [
  "fill",
  "outline",
  "hollow",
  "knockout",
  "frosted",
] as const;
export type CaptionStyle = (typeof CAPTION_STYLES)[number];

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
  denoise: z.number().min(0).max(100),
  orton: z.number().min(0).max(100),
  softGlow: z.number().min(0).max(100),
  haze: z.number().min(0).max(100),
  mist: z.number().min(0).max(100),
  diffusion: z.number().min(0).max(100),
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
  /** Stable per-caption id — a photo can carry any number of captions, each
   *  independently positioned, styled and deletable. */
  id: z.string(),
  text: z.string().max(500),
  fontFamily: z.string(),
  fontWeight: z.number().int().min(100).max(900),
  /** Percent of the canvas short edge. */
  sizePct: z.number().min(0.5).max(15),
  color: hexColor,
  opacity: z.number().min(0).max(1),
  align: z.enum(["left", "center", "right"]),
  /** "fill": plain coloured text (default). "outline": adds a stroke around
   *  each glyph, using borderColor/borderWidthPct — classic caption look for
   *  reading over a busy photo. "knockout": punches the text out of a solid
   *  box (backgroundColor), so the photo shows through the letter shapes. */
  style: z.enum(CAPTION_STYLES),
  borderColor: hexColor,
  /** Stroke width as a percent of the caption's own font size. */
  borderWidthPct: z.number().min(0).max(20),
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
  /** Extra box size, as a percent of the canvas width/height. 0 means
   *  "auto" — the box tightly fits the text, as it always did before these
   *  existed. A non-zero value is a floor, not a fixed size: the box is
   *  never forced smaller than the text needs, only ever grown to at least
   *  this size. Applies to both the optional background chip (fill/outline
   *  styles) and the knockout box — whichever box is currently showing. */
  boxWidthPct: z.number().min(0).max(100),
  boxHeightPct: z.number().min(0).max(100),
  /** Blurs the photo directly behind the caption's box before anything else
   *  is painted, so text stays readable over busy backgrounds without a
   *  solid background box. Independent of `backgroundEnabled` — the two can
   *  combine (a tinted, blurred pane) or either can be used alone. */
  backdropBlurEnabled: z.boolean(),
  backdropBlurAmount: z.number().min(0).max(100),
  /** A soft, colour-matched halo behind the glyphs themselves, drawn under
   *  the ordinary drop shadow — distinct from `backdropBlurEnabled`, which
   *  blurs the photo rather than glowing the text. */
  glowEnabled: z.boolean(),
  glowAmount: z.number().min(0).max(100),
});
export type Caption = z.infer<typeof captionSchema>;

/** A crop rect in percent of the original photo — x/y is the top-left
 *  corner, width/height the selection size. `null` means uncropped. Applied
 *  before the border/frame layout, so the cropped region is treated as "the
 *  photo" for every downstream step (aspect-pad, border sizing, captions).
 *  `rotation` (degrees, straightening only) is applied first, rotating the
 *  whole photo about its own centre before the rect is cut from it. */
export const cropSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().min(1).max(100),
    height: z.number().min(1).max(100),
    rotation: z.number().min(-45).max(45),
  })
  .nullable();
export type Crop = z.infer<typeof cropSchema>;

export const editRecipeSchema = z.object({
  version: z.literal(1),
  filters: filtersSchema,
  border: borderSchema,
  crop: cropSchema,
  captions: z.array(captionSchema),
});
export type EditRecipe = z.infer<typeof editRecipeSchema>;
