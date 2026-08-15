import { FilterRenderer } from "../render/filter-renderer";
import { renderCollage } from "./render";
import { resolveCollageSources, type CollageCellInput } from "./resolve";
import { encodeSettings, type ExportOptions } from "../export/types";
import type { Collage } from "./schema";

export type { CollageCellInput as CollageCellSource };

/**
 * Renders one collage document to a single Blob. Reuses one FilterRenderer
 * across every filtered cell — the same "expensive to create, cheap to
 * reuse" convention as ExportRenderer. The per-cell GPU-filter-then-
 * snapshot logic lives in resolveCollageSources(), shared with the live
 * preview canvas so the two draw paths can't silently diverge.
 */
export class CollageExportRenderer {
  private readonly glCanvas = new OffscreenCanvas(1, 1);
  private readonly outCanvas = new OffscreenCanvas(1, 1);
  private renderer: FilterRenderer | null = null;

  private ensureRenderer(): FilterRenderer {
    if (!this.renderer) {
      const created = FilterRenderer.create(this.glCanvas);
      if (!created) throw new Error("WebGL2 is unavailable here");
      this.renderer = created;
    }
    return this.renderer;
  }

  async render(
    collage: Collage,
    cells: (CollageCellInput | null)[],
    canvasWidth: number,
    canvasHeight: number,
    options: ExportOptions,
  ): Promise<Blob> {
    const ctx = this.outCanvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");

    const { sources, snapshots } = await resolveCollageSources(
      cells,
      () => this.ensureRenderer(),
      this.glCanvas,
    );

    try {
      renderCollage({ ctx, collage, canvasWidth, canvasHeight, sources });
      return await this.outCanvas.convertToBlob(encodeSettings(options));
    } finally {
      for (const snapshot of snapshots) snapshot.close();
    }
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }
}
