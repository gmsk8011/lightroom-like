import {
  CollageExportRenderer,
  collageCanvasSize,
  formatFilename,
  type CollageCellSource,
  type ExportOptions,
} from "@lrl/engine";
import { readPhotoFile } from "@/lib/catalog/import";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import { useCollageStore } from "@/stores/collage-store";
import { downloadBlob } from "./download";

// A collage has no single "native resolution" the way one photo does —
// each cell can be a different source photo at a different size — so a
// fixed target long edge is simplest. 4000px covers large-format print at
// a reasonable DPI without risking per-cell WebGL max-texture-size limits.
const EXPORT_LONG_EDGE = 4000;

/** Renders the current collage document at full resolution and downloads
 *  it as one file. Runs on the main thread — a collage export is one
 *  output image, not a batch of hundreds, so the worker-pool machinery
 *  built for bulk per-photo export would be overkill here. */
export async function exportCollage(options: ExportOptions): Promise<void> {
  const { collage } = useCollageStore.getState();
  const { byId } = useCatalogStore.getState();
  const recipes = useRecipeStore.getState();

  const bitmaps: ImageBitmap[] = [];
  try {
    const cells: (CollageCellSource | null)[] = [];
    for (const cell of collage.cells) {
      if (!cell.photoId) {
        cells.push(null);
        continue;
      }
      const photo = byId[cell.photoId];
      if (!photo) {
        cells.push(null);
        continue;
      }
      const file = await readPhotoFile(photo);
      const bitmap = await createImageBitmap(file);
      bitmaps.push(bitmap);
      cells.push({ bitmap, recipe: recipes.get(photo.id) });
    }

    const { width, height } = collageCanvasSize(
      collage.aspect,
      collage.rows,
      collage.cols,
      EXPORT_LONG_EDGE,
    );

    const renderer = new CollageExportRenderer();
    try {
      const blob = await renderer.render(collage, cells, width, height, options);
      downloadBlob(
        blob,
        formatFilename(options.filenameTemplate, "collage", 1, options),
      );
    } finally {
      renderer.dispose();
    }
  } finally {
    for (const bitmap of bitmaps) bitmap.close();
  }
}
