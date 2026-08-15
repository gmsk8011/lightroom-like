"use client";

import { create } from "zustand";

export type MobileSheet = "none" | "library" | "adjust";
export type EditorMode = "edit" | "collage";

interface UiState {
  /** "edit" is the existing single-photo editor; "collage" swaps the rails
   *  and canvas for the collage builder. TopBar/Filmstrip stay shared. */
  mode: EditorMode;
  /** Desktop rail collapse. Mobile uses `mobileSheet` instead, so the two
   *  never fight and there is no hydration mismatch on first paint. */
  leftOpen: boolean;
  rightOpen: boolean;
  mobileSheet: MobileSheet;
  filmstripOpen: boolean;
  showOriginal: boolean;
  /** Which caption the panel is editing / the canvas highlights while
   *  dragging. Shared between the caption panel and the preview canvas so
   *  clicking a caption on the photo selects it in the panel and vice versa. */
  selectedCaptionId: string | null;
  /** Whether the crop tool is active on the preview canvas. */
  cropMode: boolean;
  /** Draft straighten angle while the crop tool is open — lives here rather
   *  than as local state in the canvas so the Crop side panel can host the
   *  slider instead of the floating canvas toolbar. */
  cropRotation: number;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleFilmstrip: () => void;
  setMobileSheet: (sheet: MobileSheet) => void;
  setShowOriginal: (show: boolean) => void;
  setSelectedCaptionId: (id: string | null) => void;
  setCropMode: (active: boolean) => void;
  setCropRotation: (degrees: number) => void;
  setMode: (mode: EditorMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mode: "edit",
  leftOpen: true,
  rightOpen: true,
  mobileSheet: "none",
  filmstripOpen: true,
  showOriginal: false,
  selectedCaptionId: null,
  cropMode: false,
  cropRotation: 0,
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  toggleFilmstrip: () => set((s) => ({ filmstripOpen: !s.filmstripOpen })),
  setMobileSheet: (mobileSheet) => set({ mobileSheet }),
  setShowOriginal: (showOriginal) => set({ showOriginal }),
  setSelectedCaptionId: (selectedCaptionId) => set({ selectedCaptionId }),
  setCropMode: (cropMode) => set({ cropMode }),
  setCropRotation: (cropRotation) => set({ cropRotation }),
  setMode: (mode) => set({ mode }),
}));
