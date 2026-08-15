"use client";

import { create } from "zustand";
import {
  applyPreset,
  cloneRecipe,
  createDefaultRecipe,
  DEFAULT_BORDER,
  DEFAULT_CAPTION,
  DEFAULT_FILTERS,
  type Border,
  type Caption,
  type EditRecipe,
  type FilterPreset,
  type Filters,
} from "@lrl/engine";

/**
 * Every photo gets its own recipe, keyed by photo id — this is what makes
 * per-photo edits and "apply to all" meaningful rather than a no-op. A photo
 * with no entry yet reads as `createDefaultRecipe()` rather than crashing,
 * so callers never have to null-check before a photo's first edit.
 */
interface RecipeState {
  recipes: Record<string, EditRecipe>;

  get: (photoId: string) => EditRecipe;
  /** Creates a default entry for any id that doesn't have one yet. Called on
   *  import so every photo has a recipe before it's ever edited. */
  ensure: (photoIds: string[]) => void;
  discard: (photoIds: string[]) => void;
  clear: () => void;

  setFilter: <K extends keyof Filters>(
    photoId: string,
    key: K,
    value: Filters[K],
  ) => void;
  setBorder: <K extends keyof Border>(
    photoId: string,
    key: K,
    value: Border[K],
  ) => void;
  setCaption: <K extends keyof Caption>(
    photoId: string,
    key: K,
    value: Caption[K],
  ) => void;
  applyFilterPreset: (photoId: string, preset: FilterPreset) => void;
  replaceRecipe: (photoId: string, recipe: EditRecipe) => void;

  resetFilters: (photoId: string) => void;
  resetBorder: (photoId: string) => void;
  resetCaption: (photoId: string) => void;
  resetAll: (photoId: string) => void;

  /** Copies one photo's recipe onto every id in `targetIds`, source included. */
  applyToAll: (sourcePhotoId: string, targetIds: string[]) => void;
}

function withRecipe(
  recipes: Record<string, EditRecipe>,
  photoId: string,
  update: (current: EditRecipe) => EditRecipe,
): Record<string, EditRecipe> {
  const current = recipes[photoId] ?? createDefaultRecipe();
  return { ...recipes, [photoId]: update(current) };
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: {},

  get: (photoId) => get().recipes[photoId] ?? createDefaultRecipe(),

  ensure: (photoIds) =>
    set((s) => {
      const next = { ...s.recipes };
      let changed = false;
      for (const id of photoIds) {
        if (!next[id]) {
          next[id] = createDefaultRecipe();
          changed = true;
        }
      }
      return changed ? { recipes: next } : s;
    }),

  discard: (photoIds) =>
    set((s) => {
      const next = { ...s.recipes };
      for (const id of photoIds) delete next[id];
      return { recipes: next };
    }),

  clear: () => set({ recipes: {} }),

  setFilter: (photoId, key, value) =>
    set((s) => ({
      recipes: withRecipe(s.recipes, photoId, (r) => ({
        ...r,
        // A manual tweak detaches the recipe from its preset label.
        filters: { ...r.filters, [key]: value, preset: null },
      })),
    })),

  setBorder: (photoId, key, value) =>
    set((s) => ({
      recipes: withRecipe(s.recipes, photoId, (r) => ({
        ...r,
        border: { ...r.border, [key]: value },
      })),
    })),

  setCaption: (photoId, key, value) =>
    set((s) => ({
      recipes: withRecipe(s.recipes, photoId, (r) => ({
        ...r,
        caption: { ...r.caption, [key]: value },
      })),
    })),

  applyFilterPreset: (photoId, preset) =>
    set((s) => ({
      recipes: withRecipe(s.recipes, photoId, (r) => ({
        ...r,
        filters: applyPreset(preset),
      })),
    })),

  replaceRecipe: (photoId, recipe) =>
    set((s) => ({ recipes: { ...s.recipes, [photoId]: recipe } })),

  resetFilters: (photoId) =>
    set((s) => ({
      recipes: withRecipe(s.recipes, photoId, (r) => ({
        ...r,
        filters: { ...DEFAULT_FILTERS },
      })),
    })),
  resetBorder: (photoId) =>
    set((s) => ({
      recipes: withRecipe(s.recipes, photoId, (r) => ({
        ...r,
        border: { ...DEFAULT_BORDER },
      })),
    })),
  resetCaption: (photoId) =>
    set((s) => ({
      recipes: withRecipe(s.recipes, photoId, (r) => ({
        ...r,
        caption: { ...DEFAULT_CAPTION },
      })),
    })),
  resetAll: (photoId) =>
    set((s) => ({
      recipes: { ...s.recipes, [photoId]: createDefaultRecipe() },
    })),

  applyToAll: (sourcePhotoId, targetIds) =>
    set((s) => {
      const source = s.recipes[sourcePhotoId] ?? createDefaultRecipe();
      const next = { ...s.recipes };
      for (const id of targetIds) next[id] = cloneRecipe(source);
      return { recipes: next };
    }),
}));
