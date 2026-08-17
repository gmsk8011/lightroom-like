import { z } from "zod";
import { ASPECT_RATIOS } from "../recipe/schema";

/**
 * A collage is a separate document from a photo's own EditRecipe — it spans
 * many photos rather than editing one, so it gets its own schema/store
 * rather than being shoehorned into the per-photo recipe shape.
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected a #rrggbb colour");

export const collageCellSchema = z.object({
  /** Null means the cell is empty. Each photo keeps its own existing filter
   *  adjustments when placed in a cell — a collage cell has no crop/border/
   *  caption of its own, only a cover-fit crop to the cell's own aspect. */
  photoId: z.string().nullable(),
  /** Pan within the cell's cover-fit crop, as percent of the room available
   *  to move (-50..50, 0 = centred). Room to pan exists whenever the source
   *  photo's aspect doesn't exactly match the cell's — cover-fit already
   *  crops one axis, and this picks where within that crop to sit. */
  offsetX: z.number().min(-50).max(50),
  offsetY: z.number().min(-50).max(50),
  /** 1 = plain cover-fit. Above 1 crops in tighter, which also opens up
   *  more room to pan on whichever axis was previously unconstrained. */
  zoom: z.number().min(1).max(3),
});
export type CollageCell = z.infer<typeof collageCellSchema>;

export const collageSchema = z.object({
  version: z.literal(1),
  rows: z.number().int().min(1).max(8),
  cols: z.number().int().min(1).max(8),
  /** Overall canvas shape. Reuses the same enum borders already use rather
   *  than inventing a second aspect-ratio concept. */
  aspect: z.enum(ASPECT_RATIOS),
  /** Percent of the canvas's short edge — same convention as border widths. */
  gapPct: z.number().min(0).max(10),
  gapColor: hexColor,
  borderWidthPct: z.number().min(0).max(15),
  borderColor: hexColor,
  radiusPct: z.number().min(0).max(20),
  /** Row-major, length always rows * cols. */
  cells: z.array(collageCellSchema),
});
export type Collage = z.infer<typeof collageSchema>;
