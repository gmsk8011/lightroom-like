import { areFiltersDefault } from "../recipe/defaults";
import type { Filters } from "../recipe/schema";
import type { FilterRenderer, RenderCanvas } from "../render/filter-renderer";
import type { CollageSource } from "./render";

export interface CollageCellInput {
  bitmap: ImageBitmap;
  filters: Filters;
}

export interface ResolvedCollageSources {
  sources: (CollageSource | null)[];
  /** ImageBitmap snapshots taken off the shared GL canvas — the caller owns
   *  these and must close() them once renderCollage() has consumed them. */
  snapshots: ImageBitmap[];
}

/**
 * Turns per-cell (bitmap, filters) pairs into the CollageSource array
 * renderCollage() expects, reusing one FilterRenderer sequentially across
 * every filtered cell — the same "expensive to create, cheap to reuse"
 * convention as ExportRenderer.
 *
 * Because renderCollage() draws every cell against one shared destination
 * canvas in a single pass, a GPU-filtered cell has to be snapshotted off the
 * shared GL canvas via createImageBitmap() before the next cell's filter
 * pass overwrites it. A cell with no filters applied skips that and uses
 * its source bitmap directly. Shared between CollageExportRenderer and the
 * live preview canvas so the two can't silently diverge.
 */
export async function resolveCollageSources(
  cells: (CollageCellInput | null)[],
  /** Lazy — only invoked the first time a cell actually needs GPU
   *  filtering, so a collage with no filtered photos never pays for a
   *  WebGL context it doesn't use. */
  getRenderer: () => FilterRenderer,
  glCanvas: RenderCanvas,
): Promise<ResolvedCollageSources> {
  const sources: (CollageSource | null)[] = [];
  const snapshots: ImageBitmap[] = [];

  for (const cell of cells) {
    if (!cell) {
      sources.push(null);
      continue;
    }

    if (areFiltersDefault(cell.filters)) {
      sources.push({
        image: cell.bitmap,
        width: cell.bitmap.width,
        height: cell.bitmap.height,
      });
      continue;
    }

    const renderer = getRenderer();
    const limit = renderer.maxTextureSize;
    if (cell.bitmap.width > limit || cell.bitmap.height > limit) {
      throw new Error(
        `A photo in this collage is larger than this GPU can filter in one pass (${limit}px limit)`,
      );
    }
    renderer.setSource(cell.bitmap);
    renderer.setSize(cell.bitmap.width, cell.bitmap.height);
    renderer.render(cell.filters);

    const snapshot = await createImageBitmap(glCanvas as ImageBitmapSource);
    snapshots.push(snapshot);
    sources.push({ image: snapshot, width: snapshot.width, height: snapshot.height });
  }

  return { sources, snapshots };
}
