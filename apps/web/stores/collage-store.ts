"use client";

import { create } from "zustand";
import {
  createDefaultCollage,
  resizeCells,
  type AspectRatio,
  type Collage,
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
   *  is selected. */
  assignPhoto: (photoId: string) => void;
  /** Swaps the two selected cells' photos — a no-op unless exactly two are
   *  selected. */
  swapSelected: () => void;
  clearCell: (index: number) => void;
  clearAll: () => void;
  reset: () => void;
}

export const useCollageStore = create<CollageState>((set) => ({
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

  assignPhoto: (photoId) =>
    set((s) => {
      if (s.selectedCells.length !== 1) return s;
      const [index] = s.selectedCells;
      const cells = s.collage.cells.map((c, i) => (i === index ? { photoId } : c));
      return { collage: { ...s.collage, cells } };
    }),

  swapSelected: () =>
    set((s) => {
      if (s.selectedCells.length !== 2) return s;
      const [a, b] = s.selectedCells as [number, number];
      const cells = [...s.collage.cells];
      const tmp = cells[a]!;
      cells[a] = cells[b]!;
      cells[b] = tmp;
      return { collage: { ...s.collage, cells } };
    }),

  clearCell: (index) =>
    set((s) => {
      const cells = s.collage.cells.map((c, i) =>
        i === index ? { photoId: null } : c,
      );
      return { collage: { ...s.collage, cells } };
    }),

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
