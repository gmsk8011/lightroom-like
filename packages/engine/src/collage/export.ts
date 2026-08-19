import { FilterRenderer } from "../render/filter-renderer";
import { renderCollage } from "./render";
import { resolveCollageSources, type CollageCellInput } from "./resolve";
import { encodeSettings, type ExportOptions } from "../export/types";
import type { Collage } from "./schema";

export type { CollageCellInput as CollageCellSource };

/**
 * Renders one collage document to a single Blob. Reuses one FilterRenderer
 * and one set of scratch canvases across every cell — the same "expensive
 * to create, cheap to reuse" convention as ExportRenderer. Each cell is put
 * through the full single-photo pipeline by resolveCollageSources(), which
 * the live preview canvas shares, so the two can't drift apart.
 */
export class CollageExportRenderer {
  private readonly glCanvas = new OffscreenCanvas(1, 1);
  private readonly frameCanvas = new OffscreenCanvas(1, 1);
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
      this.frameCanvas,
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
