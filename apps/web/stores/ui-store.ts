"use client";

import { create } from "zustand";

export type MobileSheet = "none" | "library" | "adjust";

interface UiState {
  /** Desktop rail collapse. Mobile uses `mobileSheet` instead, so the two
   *  never fight and there is no hydration mismatch on first paint. */
  leftOpen: boolean;
  rightOpen: boolean;
  mobileSheet: MobileSheet;
  filmstripOpen: boolean;
  showOriginal: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleFilmstrip: () => void;
  setMobileSheet: (sheet: MobileSheet) => void;
  setShowOriginal: (show: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  leftOpen: true,
  rightOpen: true,
  mobileSheet: "none",
  filmstripOpen: true,
  showOriginal: false,
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  toggleFilmstrip: () => set((s) => ({ filmstripOpen: !s.filmstripOpen })),
  setMobileSheet: (mobileSheet) => set({ mobileSheet }),
  setShowOriginal: (showOriginal) => set({ showOriginal }),
}));
