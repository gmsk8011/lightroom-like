import type { FilterPreset } from "./builtin";

/**
 * Approximations of Fujifilm's 20 in-camera Film Simulations, built from this
 * app's tone/colour/effects sliders. These are not colour-science-accurate
 * LUT reproductions — Fuji's sims work on RAW sensor data through per-hue
 * response curves this engine doesn't have — but each preset targets the
 * same visual signature photographers associate with the simulation name:
 * Velvia's saturated punch, Classic Chrome's muted highlights, Acros'
 * heavier-than-average-mono contrast, and so on.
 */
export const FUJIFILM_PRESETS: FilterPreset[] = [
  {
    id: "fuji-provia",
    label: "PROVIA/Standard",
    overrides: { contrast: 6, vibrance: 8, saturation: 4 },
  },
  {
    id: "fuji-velvia",
    label: "Velvia/Vivid",
    overrides: {
      contrast: 20,
      saturation: 26,
      vibrance: 18,
      clarity: 10,
      shadows: -6,
    },
  },
  {
    id: "fuji-astia",
    label: "ASTIA/Soft",
    overrides: {
      contrast: -4,
      saturation: 10,
      vibrance: 6,
      highlights: -8,
      shadows: 6,
    },
  },
  {
    id: "fuji-classic-chrome",
    label: "Classic Chrome",
    overrides: {
      contrast: 14,
      saturation: -18,
      highlights: -20,
      shadows: -8,
      temperature: 4,
      clarity: 8,
    },
  },
  {
    id: "fuji-pro-neg-hi",
    label: "PRO Neg. Hi",
    overrides: {
      contrast: 10,
      saturation: -6,
      vibrance: -4,
      highlights: -10,
    },
  },
  {
    id: "fuji-pro-neg-std",
    label: "PRO Neg. Std",
    overrides: {
      contrast: -6,
      saturation: -8,
      vibrance: -6,
      highlights: -6,
      shadows: 8,
    },
  },
  {
    id: "fuji-classic-neg",
    label: "Classic Neg.",
    overrides: {
      contrast: 16,
      saturation: -10,
      temperature: -6,
      tint: 4,
      shadows: -14,
      highlights: -10,
      grain: 14,
    },
  },
  {
    id: "fuji-nostalgic-neg",
    label: "Nostalgic Neg.",
    overrides: {
      contrast: -8,
      saturation: -6,
      temperature: 18,
      tint: 6,
      shadows: 14,
      highlights: -16,
      grain: 10,
    },
  },
  {
    id: "fuji-eterna",
    label: "ETERNA/Cinema",
    overrides: {
      contrast: -20,
      saturation: -24,
      shadows: 18,
      highlights: -22,
      blacks: 16,
      clarity: -6,
    },
  },
  {
    id: "fuji-eterna-bleach-bypass",
    label: "Eterna Bleach Bypass",
    overrides: {
      contrast: 24,
      saturation: -60,
      clarity: 16,
      shadows: -10,
      highlights: -8,
    },
  },
  {
    id: "fuji-acros",
    label: "ACROS",
    overrides: { saturation: -100, contrast: 20, clarity: 16, grain: 8 },
  },
  {
    id: "fuji-acros-ye",
    label: "ACROS + Ye Filter",
    overrides: {
      saturation: -100,
      contrast: 22,
      highlights: -8,
      clarity: 16,
      grain: 8,
    },
  },
  {
    id: "fuji-acros-r",
    label: "ACROS + R Filter",
    overrides: {
      saturation: -100,
      contrast: 32,
      highlights: -18,
      whites: 10,
      clarity: 20,
      grain: 8,
    },
  },
  {
    id: "fuji-acros-g",
    label: "ACROS + G Filter",
    overrides: {
      saturation: -100,
      contrast: 16,
      shadows: 8,
      clarity: 12,
      grain: 8,
    },
  },
  {
    id: "fuji-monochrome",
    label: "Monochrome",
    overrides: { saturation: -100, contrast: 12, clarity: 8 },
  },
  {
    id: "fuji-monochrome-ye",
    label: "Monochrome + Ye Filter",
    overrides: { saturation: -100, contrast: 14, highlights: -6, clarity: 8 },
  },
  {
    id: "fuji-monochrome-r",
    label: "Monochrome + R Filter",
    overrides: {
      saturation: -100,
      contrast: 24,
      highlights: -14,
      whites: 8,
      clarity: 12,
    },
  },
  {
    id: "fuji-monochrome-g",
    label: "Monochrome + G Filter",
    overrides: { saturation: -100, contrast: 8, shadows: 6, clarity: 6 },
  },
  {
    // Saturation stops short of -100: full desaturation would zero the warm
    // cast entirely (saturation runs after temperature/tint in the pipeline
    // and blends toward pure luma), leaving plain grayscale instead of sepia.
    id: "fuji-sepia",
    label: "Sepia",
    overrides: {
      saturation: -85,
      temperature: 45,
      tint: 12,
      contrast: 8,
      shadows: 10,
    },
  },
  {
    id: "fuji-reala-ace",
    label: "Reala ACE",
    overrides: {
      contrast: 10,
      saturation: 6,
      vibrance: 10,
      highlights: -6,
      shadows: -4,
    },
  },
];
