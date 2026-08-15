"use client";

import { create } from "zustand";
import {
  applyPreset,
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

interface RecipeState {
  recipe: EditRecipe;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  setBorder: <K extends keyof Border>(key: K, value: Border[K]) => void;
  setCaption: <K extends keyof Caption>(key: K, value: Caption[K]) => void;
  applyFilterPreset: (preset: FilterPreset) => void;
  replaceRecipe: (recipe: EditRecipe) => void;
  resetFilters: () => void;
  resetBorder: () => void;
  resetCaption: () => void;
  resetAll: () => void;
}

export const useRecipeStore = create<RecipeState>((set) => ({
  recipe: createDefaultRecipe(),

  setFilter: (key, value) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        // A manual tweak detaches the recipe from its preset label.
        filters: { ...s.recipe.filters, [key]: value, preset: null },
      },
    })),

  setBorder: (key, value) =>
    set((s) => ({
      recipe: { ...s.recipe, border: { ...s.recipe.border, [key]: value } },
    })),

  setCaption: (key, value) =>
    set((s) => ({
      recipe: { ...s.recipe, caption: { ...s.recipe.caption, [key]: value } },
    })),

  applyFilterPreset: (preset) =>
    set((s) => ({ recipe: { ...s.recipe, filters: applyPreset(preset) } })),

  replaceRecipe: (recipe) => set({ recipe }),

  resetFilters: () =>
    set((s) => ({ recipe: { ...s.recipe, filters: { ...DEFAULT_FILTERS } } })),
  resetBorder: () =>
    set((s) => ({ recipe: { ...s.recipe, border: { ...DEFAULT_BORDER } } })),
  resetCaption: () =>
    set((s) => ({ recipe: { ...s.recipe, caption: { ...DEFAULT_CAPTION } } })),
  resetAll: () => set({ recipe: createDefaultRecipe() }),
}));
