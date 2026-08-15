"use client";

import { create } from "zustand";
import type { ImportResult, Photo } from "@/lib/catalog/types";
import { thumbnails } from "@/lib/thumbnails/service";
import { useRecipeStore } from "./recipe-store";

export interface SelectOptions {
  /** Cmd/Ctrl-click: add or remove a single photo. */
  toggle?: boolean;
  /** Shift-click: select everything between the anchor and this photo. */
  range?: boolean;
}

interface CatalogState {
  /** Display order. Kept separate from the records so updating one photo's
   *  thumbnail doesn't invalidate the whole list for every subscriber. */
  order: string[];
  byId: Record<string, Photo>;
  selected: Set<string>;
  activeId: string | null;
  anchorId: string | null;
  directoryHandle: FileSystemDirectoryHandle | null;
  directoryName: string | null;
  skipped: number;

  addImport: (result: ImportResult) => void;
  updatePhoto: (id: string, patch: Partial<Photo>) => void;
  select: (id: string, options?: SelectOptions) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clear: () => void;
  /** Removes one photo from the library (and its recipe) — never touches
   *  the file on disk, only what Framer is tracking in this session. */
  removePhoto: (id: string) => void;
  /** Removes every currently-selected photo the same way. */
  removeSelected: () => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  order: [],
  byId: {},
  selected: new Set(),
  activeId: null,
  anchorId: null,
  directoryHandle: null,
  directoryName: null,
  skipped: 0,

  addImport: (result) =>
    set(() => {
      const byId: Record<string, Photo> = {};
      const order: string[] = [];
      for (const photo of result.photos) {
        if (byId[photo.id]) continue;
        byId[photo.id] = photo;
        order.push(photo.id);
      }
      const first = order[0] ?? null;
      // Every photo gets a default recipe up front, so switching to any of
      // them — before it's ever been touched — has something to read.
      useRecipeStore.getState().ensure(order);
      return {
        order,
        byId,
        selected: first ? new Set([first]) : new Set<string>(),
        activeId: first,
        anchorId: first,
        directoryHandle: result.directoryHandle,
        directoryName: result.directoryName,
        skipped: result.skipped,
      };
    }),

  updatePhoto: (id, patch) =>
    set((s) => {
      const existing = s.byId[id];
      if (!existing) return s;
      return { byId: { ...s.byId, [id]: { ...existing, ...patch } } };
    }),

  select: (id, options = {}) =>
    set((s) => {
      if (options.range && s.anchorId) {
        const from = s.order.indexOf(s.anchorId);
        const to = s.order.indexOf(id);
        if (from !== -1 && to !== -1) {
          const [lo, hi] = from < to ? [from, to] : [to, from];
          return {
            selected: new Set(s.order.slice(lo, hi + 1)),
            activeId: id,
          };
        }
      }

      if (options.toggle) {
        const next = new Set(s.selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selected: next, activeId: id, anchorId: id };
      }

      return { selected: new Set([id]), activeId: id, anchorId: id };
    }),

  selectAll: () => set((s) => ({ selected: new Set(s.order) })),

  clearSelection: () => set({ selected: new Set() }),

  clear: () => {
    thumbnails.reset();
    useRecipeStore.getState().clear();
    set({
      order: [],
      byId: {},
      selected: new Set(),
      activeId: null,
      anchorId: null,
      directoryHandle: null,
      directoryName: null,
      skipped: 0,
    });
  },

  removePhoto: (id) => {
    set((s) => {
      if (!s.byId[id]) return s;
      const order = s.order.filter((x) => x !== id);
      const byId = { ...s.byId };
      delete byId[id];
      const selected = new Set(s.selected);
      selected.delete(id);

      let activeId = s.activeId;
      if (activeId === id) {
        const oldIndex = s.order.indexOf(id);
        activeId = order[Math.min(oldIndex, order.length - 1)] ?? null;
        if (activeId) selected.add(activeId);
      }
      const anchorId = s.anchorId === id ? activeId : s.anchorId;

      return { order, byId, selected, activeId, anchorId };
    });
    useRecipeStore.getState().discard([id]);
  },

  removeSelected: () => {
    for (const id of get().selected) get().removePhoto(id);
  },
}));

/** Convenience selector — the photo currently shown on the canvas. */
export function useActivePhoto(): Photo | null {
  return useCatalogStore((s) => (s.activeId ? (s.byId[s.activeId] ?? null) : null));
}

export function usePhotoCount(): number {
  return useCatalogStore((s) => s.order.length);
}

export function getPhotos(ids: Iterable<string>): Photo[] {
  const { byId } = useCatalogStore.getState();
  const out: Photo[] = [];
  for (const id of ids) {
    const photo = byId[id];
    if (photo) out.push(photo);
  }
  return out;
}
