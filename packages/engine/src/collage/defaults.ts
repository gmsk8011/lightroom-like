import type { Collage, CollageCell } from "./schema";

export const DEFAULT_GAP_PCT = 2;
export const DEFAULT_GAP_COLOR = "#ffffff";
export const DEFAULT_COLLAGE_BORDER_WIDTH_PCT = 0;
export const DEFAULT_COLLAGE_BORDER_COLOR = "#ffffff";
export const DEFAULT_COLLAGE_RADIUS_PCT = 0;

export function emptyCells(rows: number, cols: number): CollageCell[] {
  return Array.from({ length: rows * cols }, () => ({ photoId: null }));
}

export function createDefaultCollage(): Collage {
  return {
    version: 1,
    rows: 1,
    cols: 2,
    aspect: "1:1",
    gapPct: DEFAULT_GAP_PCT,
    gapColor: DEFAULT_GAP_COLOR,
    borderWidthPct: DEFAULT_COLLAGE_BORDER_WIDTH_PCT,
    borderColor: DEFAULT_COLLAGE_BORDER_COLOR,
    radiusPct: DEFAULT_COLLAGE_RADIUS_PCT,
    cells: emptyCells(1, 2),
  };
}

/** Resizes the cell list to rows*cols, preserving existing assignments by
 *  index — switching from 2x2 to 3x3 shouldn't wipe out photos already
 *  placed in the first four cells. Extra cells are padded empty; cells that
 *  no longer fit are dropped. */
export function resizeCells(
  cells: CollageCell[],
  rows: number,
  cols: number,
): CollageCell[] {
  const next = emptyCells(rows, cols);
  for (let i = 0; i < Math.min(cells.length, next.length); i++) {
    next[i] = cells[i]!;
  }
  return next;
}

/** Forward-compat defensive merge for a persisted/partial collage document,
 *  same purpose as normalizeRecipe — a field added after a collage was
 *  saved shouldn't crash the UI reading it back. */
export function normalizeCollage(
  input: Partial<Collage> | null | undefined,
): Collage {
  if (!input) return createDefaultCollage();
  const rows = input.rows ?? 1;
  const cols = input.cols ?? 2;
  return {
    version: 1,
    rows,
    cols,
    aspect: input.aspect ?? "1:1",
    gapPct: input.gapPct ?? DEFAULT_GAP_PCT,
    gapColor: input.gapColor ?? DEFAULT_GAP_COLOR,
    borderWidthPct: input.borderWidthPct ?? DEFAULT_COLLAGE_BORDER_WIDTH_PCT,
    borderColor: input.borderColor ?? DEFAULT_COLLAGE_BORDER_COLOR,
    radiusPct: input.radiusPct ?? DEFAULT_COLLAGE_RADIUS_PCT,
    cells: resizeCells(input.cells ?? [], rows, cols),
  };
}
