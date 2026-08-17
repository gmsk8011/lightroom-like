"use client";

import { create } from "zustand";
import {
  createDefaultCollage,
  resizeCells,
  EMPTY_CELL,
  type AspectRatio,
  type Collage,
  type CollageCell,
} from "@lrl/engine";

/**
 * A single collage document — not keyed by photo id like recipe-store,
 * since a collage is one document spanning many photos, not a per-photo
 * edit. Not persisted in v1: it resets on reload, same as other purely
 * session-scoped UI state.
 */
interface CollageState {
  collage: Collage;
  /** 0, 1, or 2 cell indices. Exactly 2 enables the Swap action. */
  selectedCells: number[];

  setGrid: (rows: number, cols: number) => void;
  setAspect: (aspect: AspectRatio) => void;
  setGap: (gapPct: number) => void;
  setGapColor: (color: string) => void;
  setBorderWidth: (borderWidthPct: number) => void;
  setBorderColor: (color: string) => void;
  setRadius: (radiusPct: number) => void;

  /** additive=true (shift-click) grows the selection toward 2 for a swap;
   *  a plain click replaces the selection with just this cell. */
  selectCell: (index: number, additive?: boolean) => void;
  clearSelection: () => void;

  /** Assigns to the single selected cell — a no-op unless exactly one cell
   *  is selected. Resets that cell's pan/zoom, since a leftover crop
   *  position from whatever photo was there before isn't meaningful. */
  assignPhoto: (photoId: string) => void;
  /** Assigns directly by index, independent of selection — the drag-and-
   *  drop assignment path (dropping a filmstrip photo onto a cell). */
  setCellPhoto: (index: number, photoId: string) => void;
  /** Swaps the two selected cells' photos (including pan/zoom) — a no-op
   *  unless exactly two are selected. */
  swapSelected: () => void;
  /** Swaps two cells directly by index — the drag-a-cell-onto-another-cell
   *  path. */
  swapCells: (a: number, b: number) => void;
  /** Merges a pan/zoom patch into one cell, leaving its photo untouched. */
  setCellTransform: (
    index: number,
    patch: Partial<Pick<CollageCell, "offsetX" | "offsetY" | "zoom">>,
  ) => void;
  clearCell: (index: number) => void;
  clearAll: () => void;
  reset: () => void;
}

function withCell(
  cells: CollageCell[],
  index: number,
  update: (cell: CollageCell) => CollageCell,
): CollageCell[] {
  return cells.map((c, i) => (i === index ? update(c) : c));
}

export const useCollageStore = create<CollageState>((set, get) => ({
  collage: createDefaultCollage(),
  selectedCells: [],

  setGrid: (rows, cols) =>
    set((s) => ({
      collage: {
        ...s.collage,
        rows,
        cols,
        cells: resizeCells(s.collage.cells, rows, cols),
      },
      selectedCells: [],
    })),

  setAspect: (aspect) => set((s) => ({ collage: { ...s.collage, aspect } })),
  setGap: (gapPct) => set((s) => ({ collage: { ...s.collage, gapPct } })),
  setGapColor: (gapColor) => set((s) => ({ collage: { ...s.collage, gapColor } })),
  setBorderWidth: (borderWidthPct) =>
    set((s) => ({ collage: { ...s.collage, borderWidthPct } })),
  setBorderColor: (borderColor) =>
    set((s) => ({ collage: { ...s.collage, borderColor } })),
  setRadius: (radiusPct) => set((s) => ({ collage: { ...s.collage, radiusPct } })),

  selectCell: (index, additive = false) =>
    set((s) => {
      if (!additive) return { selectedCells: [index] };
      if (s.selectedCells.includes(index)) return { selectedCells: [index] };
      if (s.selectedCells.length === 1) {
        return { selectedCells: [...s.selectedCells, index] };
      }
      return { selectedCells: [index] };
    }),

  clearSelection: () => set({ selectedCells: [] }),

  assignPhoto: (photoId) => {
    const [index] = get().selectedCells;
    if (get().selectedCells.length === 1 && index !== undefined) {
      get().setCellPhoto(index, photoId);
    }
  },

  setCellPhoto: (index, photoId) =>
    set((s) => ({
      collage: {
        ...s.collage,
        cells: withCell(s.collage.cells, index, () => ({
          ...EMPTY_CELL,
          photoId,
        })),
      },
    })),

  swapSelected: () => {
    const [a, b] = get().selectedCells;
    if (get().selectedCells.length === 2 && a !== undefined && b !== undefined) {
      get().swapCells(a, b);
    }
  },

  swapCells: (a, b) =>
    set((s) => {
      const cells = [...s.collage.cells];
      const tmp = cells[a]!;
      cells[a] = cells[b]!;
      cells[b] = tmp;
      return { collage: { ...s.collage, cells } };
    }),

  setCellTransform: (index, patch) =>
    set((s) => ({
      collage: {
        ...s.collage,
        cells: withCell(s.collage.cells, index, (c) => ({ ...c, ...patch })),
      },
    })),

  clearCell: (index) =>
    set((s) => ({
      collage: {
        ...s.collage,
        cells: withCell(s.collage.cells, index, () => ({ ...EMPTY_CELL })),
      },
    })),

  clearAll: () =>
    set((s) => ({
      collage: { ...s.collage, cells: resizeCells([], s.collage.rows, s.collage.cols) },
      selectedCells: [],
    })),

  reset: () => set({ collage: createDefaultCollage(), selectedCells: [] }),
}));

/** True once at least one cell has a photo — gates whether "Export collage"
 *  makes sense to try. */
export function useCollageHasAnyPhoto(): boolean {
  return useCollageStore((s) => s.collage.cells.some((c) => c.photoId !== null));
}
