"use client";

import { create } from "zustand";
import { createDefaultRecipe, DEFAULT_EXPORT_OPTIONS, type ExportOptions } from "@lrl/engine";
import { ExportRun, type ExportProgress } from "@/lib/export/runner";
import { useCatalogStore } from "./catalog-store";
import { useRecipeStore } from "./recipe-store";

export type ExportScope = "selected" | "all";

interface ExportState {
  open: boolean;
  scope: ExportScope;
  options: ExportOptions;
  progress: ExportProgress | null;
  run: ExportRun | null;

  setOpen: (open: boolean) => void;
  setScope: (scope: ExportScope) => void;
  setOption: <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K],
  ) => void;
  start: () => Promise<void>;
  cancel: () => void;
}

export const useExportStore = create<ExportState>((set, get) => ({
  open: false,
  scope: "selected",
  options: { ...DEFAULT_EXPORT_OPTIONS },
  progress: null,
  run: null,

  setOpen: (open) =>
    set((s) => ({
      open,
      // Clear a finished run's summary when the dialog reopens.
      progress: open && s.progress?.state !== "running" ? null : s.progress,
    })),

  setScope: (scope) => set({ scope }),

  setOption: (key, value) =>
    set((s) => ({ options: { ...s.options, [key]: value } })),

  start: async () => {
    const { scope, options } = get();
    const catalog = useCatalogStore.getState();

    const ids = scope === "all" ? catalog.order : [...catalog.selected];
    const photos = ids
      .map((id) => catalog.byId[id])
      .filter(
        (photo): photo is NonNullable<typeof photo> =>
          photo !== undefined && photo.status !== "unsupported",
      );

    if (photos.length === 0) return;

    // Each photo carries its own recipe now, so a batch export can mix a
    // photo that's been individually tweaked in with ones that share the
    // "apply to all" baseline.
    const run = new ExportRun(
      photos,
      (photo) => useRecipeStore.getState().recipes[photo.id] ?? createDefaultRecipe(),
      options,
      catalog.directoryHandle,
      (progress) => set({ progress }),
    );

    set({ run });
    await run.start();
    set({ run: null });
  },

  cancel: () => {
    get().run?.cancel();
  },
}));

/** Photos the current scope would actually export. */
export function useExportCount(): number {
  const scope = useExportStore((s) => s.scope);
  return useCatalogStore((s) => {
    const ids = scope === "all" ? s.order : [...s.selected];
    return ids.filter((id) => s.byId[id]?.status !== "unsupported").length;
  });
}
