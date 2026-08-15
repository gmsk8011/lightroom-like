import { areFiltersDefault } from "../recipe/defaults";
import type { EditRecipe } from "../recipe/schema";
import { FilterRenderer } from "../render/filter-renderer";
import { composite } from "../render/compositor";
import { encodeSettings, type ExportOptions } from "./types";

/**
 * Renders one photo at full resolution and encodes it.
 *
 * Reused across a whole export run: the WebGL context and its compiled
 * programs are expensive to create, and creating one per photo is what makes
 * naive bulk exporters crawl.
 */
export class ExportRenderer {
  private readonly glCanvas = new OffscreenCanvas(1, 1);
  private readonly outCanvas = new OffscreenCanvas(1, 1);
  private renderer: FilterRenderer | null = null;

  private ensureRenderer(): FilterRenderer {
    if (!this.renderer) {
      const created = FilterRenderer.create(this.glCanvas);
      if (!created) throw new Error("WebGL2 is unavailable in this worker");
      this.renderer = created;
    }
    return this.renderer;
  }

  async render(
    bitmap: ImageBitmap,
    recipe: EditRecipe,
    options: ExportOptions,
  ): Promise<Blob> {
    const ctx = this.outCanvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable in worker");

    // With no filter applied there is nothing for the GPU to do, and going
    // straight from the decoded bitmap keeps a no-op export pixel-exact.
    let source: CanvasImageSource = bitmap;

    if (!areFiltersDefault(recipe.filters)) {
      const renderer = this.ensureRenderer();
      const limit = renderer.maxTextureSize;
      if (bitmap.width > limit || bitmap.height > limit) {
        throw new Error(
          `Photo is larger than this GPU can filter in one pass (${limit}px limit)`,
        );
      }
      renderer.setSource(bitmap);
      renderer.setSize(bitmap.width, bitmap.height);
      renderer.render(recipe.filters);
      source = this.glCanvas;
    }

    composite({
      ctx,
      source,
      sourceWidth: bitmap.width,
      sourceHeight: bitmap.height,
      recipe,
      scale: 1,
    });

    return this.outCanvas.convertToBlob(encodeSettings(options));
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }
}
