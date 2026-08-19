import { areFiltersDefault, isIdentityRecipe } from "../recipe/defaults";
import type { EditRecipe } from "../recipe/schema";
import { composite } from "../render/compositor";
import type { FilterRenderer, RenderCanvas } from "../render/filter-renderer";
import type { FrameCanvasContext } from "../frames/types";
import type { CollageSource } from "./render";

export interface CollageCellInput {
  bitmap: ImageBitmap;
  /** The photo's whole recipe, not just its filters — a cell shows the same
   *  finished photo the single-photo editor would export, border, captions
   *  and crop included. */
  recipe: EditRecipe;
}

export interface ResolvedCollageSources {
  sources: (CollageSource | null)[];
  /** ImageBitmap snapshots taken off the shared scratch canvases — the
   *  caller owns these and must close() them once renderCollage() has
   *  consumed them. */
  snapshots: ImageBitmap[];
}

function context2d(canvas: RenderCanvas): FrameCanvasContext | null {
  return canvas.getContext("2d") as FrameCanvasContext | null;
}

/**
 * Turns per-cell (bitmap, recipe) pairs into the CollageSource array
 * renderCollage() expects, running each cell through the very same
 * FilterRenderer + composite() pipeline a single-photo export uses — so a
 * photo looks the same inside a collage cell as it does on its own, rather
 * than silently dropping everything but its filters.
 *
 * Both scratch canvases are reused across every cell, matching the
 * "expensive to create, cheap to reuse" convention ExportRenderer already
 * follows. That reuse is exactly why each cell has to be snapshotted with
 * createImageBitmap() before the next one overwrites the scratch canvas:
 * renderCollage() draws every cell against one shared destination in a
 * single pass, so it needs all of them resolved up front.
 */
export async function resolveCollageSources(
  cells: (CollageCellInput | null)[],
  /** Lazy — only invoked the first time a cell actually needs GPU
   *  filtering, so a collage with no filtered photos never pays for a
   *  WebGL context it doesn't use. */
  getRenderer: () => FilterRenderer,
  glCanvas: RenderCanvas,
  /** Scratch canvas composite() draws each finished cell into. It fully
   *  owns and resizes this canvas per cell, which is why it can't be the
   *  collage's own destination canvas. */
  frameCanvas: RenderCanvas,
): Promise<ResolvedCollageSources> {
  const sources: (CollageSource | null)[] = [];
  const snapshots: ImageBitmap[] = [];

  for (const cell of cells) {
    if (!cell) {
      sources.push(null);
      continue;
    }

    const { bitmap, recipe } = cell;

    // Nothing in the recipe would change a pixel, so the decoded bitmap is
    // already the finished look — skip both passes entirely.
    if (isIdentityRecipe(recipe)) {
      sources.push({ image: bitmap, width: bitmap.width, height: bitmap.height });
      continue;
    }

    let filtered: CanvasImageSource = bitmap;
    if (!areFiltersDefault(recipe.filters)) {
      const renderer = getRenderer();
      const limit = renderer.maxTextureSize;
      if (bitmap.width > limit || bitmap.height > limit) {
        throw new Error(
          `A photo in this collage is larger than this GPU can filter in one pass (${limit}px limit)`,
        );
      }
      renderer.setSource(bitmap);
      renderer.setSize(bitmap.width, bitmap.height);
      renderer.render(recipe.filters);
      filtered = glCanvas;
    }

    const ctx = context2d(frameCanvas);
    if (!ctx) throw new Error("2D context unavailable");

    composite({
      ctx,
      source: filtered,
      sourceWidth: bitmap.width,
      sourceHeight: bitmap.height,
      recipe,
      scale: 1,
    });

    const snapshot = await createImageBitmap(frameCanvas as ImageBitmapSource);
    snapshots.push(snapshot);
    sources.push({ image: snapshot, width: snapshot.width, height: snapshot.height });
  }

  return { sources, snapshots };
}
