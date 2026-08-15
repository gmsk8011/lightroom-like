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
    // A community film-recipe (Classic Chrome base, DR400, strong grain,
    // warm WB shift) rather than a stock in-camera simulation, chasing the
    // rich-but-soft, warm-highlight look of Kodak Portra 800 — heavier grain
    // and a lower, huskier contrast/clarity than Classic Chrome alone.
    id: "fuji-kodak-portra-800-v3",
    label: "Kodak Portra 800 v3",
    overrides: {
      exposure: 0.3,
      contrast: 4,
      highlights: -20,
      shadows: -5,
      temperature: 14,
      tint: 3,
      vibrance: 14,
      saturation: 18,
      clarity: -16,
      grain: 32,
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

  // --- Community film recipes -------------------------------------------
  // Translated from published Fujifilm "recipe" cards (highlight/shadow
  // tone curve, Color, Sharpness, Clarity, Grain Effect, Color Chrome
  // Effect/FX Blue, and WB shift), not from Fuji's own in-camera sims.
  // The mapping: highlight/shadow tone -> highlights/shadows and a small
  // contrast term (negative highlight softens, negative shadow deepens);
  // Color -> saturation/vibrance, boosted further by Color Chrome Effect
  // and FX Blue; Sharpness and Clarity both land on this engine's single
  // clarity slider; Grain Effect's strength/size maps to a 0-100 grain
  // value; WB's Red/Blue shift drives temperature (and a small tint
  // nudge from FX Blue); Exposure Compensation, where stated, becomes a
  // gentle exposure nudge. Same caveat as above: a look-alike, not a
  // colour-accurate reproduction.
  {
    id: "fuji-summer-chrome",
    label: "Summer Chrome",
    overrides: { contrast: 12, highlights: -20, shadows: -14, tint: -2, vibrance: 18, saturation: 32, clarity: -18, grain: 34 },
  },
  {
    id: "fuji-classic-cuban-neg",
    label: "Classic Cuban Neg",
    overrides: { contrast: 3, highlights: -20, shadows: 7, tint: -2, vibrance: 18, saturation: 32, clarity: -18, grain: 34 },
  },
  {
    id: "fuji-gentle-light-negative",
    label: "Gentle Light Negative",
    overrides: { contrast: 8, highlights: -20, shadows: -3, temperature: 28, vibrance: 11, saturation: 18, clarity: -21, grain: 14 },
  },
  {
    id: "fuji-tidewashed-neg",
    label: "Tidewashed Neg",
    overrides: { contrast: 8, highlights: -10, shadows: -10, temperature: 10, tint: -2, vibrance: 9, saturation: 16, clarity: -12, grain: 14 },
  },
  {
    id: "fuji-patina-negative",
    label: "Patina Negative",
    overrides: { contrast: 3, highlights: -20, shadows: 7, temperature: 23, tint: -1, vibrance: 18, saturation: 30, clarity: -14, grain: 14 },
  },
  {
    id: "fuji-leica-x",
    label: "Leica X",
    overrides: { temperature: 8, tint: -2, vibrance: 18, saturation: 32, clarity: -2 },
  },
  {
    id: "fuji-portra-800-v4",
    label: "Portra 800 \"V4\"",
    overrides: { exposure: 0.33, contrast: 11, highlights: -20, shadows: -10, temperature: 10, tint: -1, vibrance: 15, saturation: 23, clarity: -12, grain: 34 },
  },
  {
    id: "fuji-alpine-negative-recipe",
    label: "Alpine Negative Recipe",
    overrides: { contrast: 3, highlights: -20, shadows: 7, tint: -2, vibrance: 14, saturation: 24, clarity: -12 },
  },
  {
    id: "fuji-portra-di-limone",
    label: "Portra di Limone",
    overrides: { contrast: 12, highlights: -20, shadows: -14, temperature: -2, tint: -2, vibrance: 15, saturation: 23, clarity: -21, grain: 14 },
  },
  {
    id: "fuji-classic-89",
    label: "Classic '89",
    overrides: { contrast: -1, highlights: -15, shadows: 14, tint: -2, vibrance: 18, saturation: 32, clarity: -2, grain: 14 },
  },
  {
    id: "fuji-veloura",
    label: "Veloura",
    overrides: { highlights: -20, shadows: 14, temperature: 25, tint: -2, vibrance: 18, saturation: 32, clarity: -9, grain: 34 },
  },
  {
    id: "fuji-winter-season",
    label: "Winter Season",
    overrides: { contrast: -3, highlights: 10, tint: -1, vibrance: 11, saturation: 17, clarity: -6, grain: 34 },
  },
  {
    id: "fuji-pastel-pop",
    label: "pastel pop",
    overrides: { contrast: 12, highlights: -20, shadows: -14, temperature: 20, tint: -1, vibrance: 18, saturation: 30, clarity: 1 },
  },
  {
    id: "fuji-x-t30iii-chrome",
    label: "X-T30III Chrome",
    overrides: { contrast: 8, highlights: -5, shadows: -14, vibrance: 11, saturation: 15, clarity: -6, grain: 28 },
  },
  {
    id: "fuji-aya-cinematic-blue",
    label: "Aya Cinematic Blue",
    overrides: { contrast: 9, highlights: -20, shadows: -7, vibrance: 13, saturation: 19, clarity: 10, grain: 14 },
  },
  {
    id: "fuji-fujicolor-superia-1600-my-urban-version",
    label: "Fujicolor Superia 1600 (My Urban Version)",
    overrides: { contrast: 6, highlights: -10, shadows: -7, tint: -1, vibrance: 4, saturation: 7, clarity: -16, grain: 14 },
  },
  {
    id: "fuji-kodak-ultramax-400",
    label: "Kodak Ultramax 400",
    overrides: { contrast: -3, highlights: -10, shadows: 14, tint: -1, vibrance: 15, saturation: 25, clarity: -10, grain: 28 },
  },
  {
    id: "fuji-last-summer-roll",
    label: "Last Summer Roll",
    overrides: { contrast: 5, highlights: -20, shadows: 4, tint: -1, vibrance: 18, saturation: 30, clarity: -2, grain: 14 },
  },
  {
    id: "fuji-pastel-chrome-recipe",
    label: "Pastel Chrome Recipe",
    overrides: { contrast: 3, shadows: -7, tint: -1, vibrance: 18, saturation: 30, clarity: -5 },
  },
  {
    id: "fuji-polished-chrome-v2",
    label: "Polished Chrome (v2)",
    overrides: { contrast: -3, highlights: -10, shadows: 14, temperature: 23, tint: -2, vibrance: 15, saturation: 25, clarity: -5, grain: 14 },
  },
  {
    id: "fuji-cinder-chrome",
    label: "Cinder Chrome",
    overrides: { contrast: 3, highlights: -20, shadows: 7, temperature: 23, vibrance: 18, saturation: 28, clarity: -20, grain: 14 },
  },
  {
    id: "fuji-kodak-gold-200-film",
    label: "Kodak Gold 200 Film",
    overrides: { highlights: 20, shadows: -14, temperature: 25, tint: -2, vibrance: 2, saturation: 8, clarity: -1 },
  },
  {
    id: "fuji-summer-negative",
    label: "Summer Negative",
    overrides: { contrast: 5, highlights: -15, temperature: -10, tint: -2, vibrance: 11, saturation: 15, clarity: 6 },
  },
  {
    id: "fuji-acros-punch",
    label: "Acros Punch",
    overrides: { contrast: -21, highlights: 30, shadows: 28, clarity: 6 },
  },
  {
    id: "fuji-chungking-night",
    label: "Chungking Night",
    overrides: { exposure: 0.27, contrast: -6, highlights: -10, shadows: 21, tint: -1, vibrance: 15, saturation: 25, clarity: -24, grain: 34 },
  },
  {
    id: "fuji-soft-ember",
    label: "Soft Ember",
    overrides: { contrast: 9, highlights: -20, shadows: -7, temperature: 13, tint: -1, vibrance: 16, saturation: 26, clarity: -16, grain: 20 },
  },
  {
    id: "fuji-california-hues",
    label: "California Hues",
    overrides: { contrast: -1, highlights: -10, shadows: 11, tint: -1, vibrance: 18, saturation: 30, clarity: -5, grain: 34 },
  },
  {
    id: "fuji-my-most-used-recipe",
    label: "My Most Used Recipe",
    overrides: { contrast: 3, highlights: -20, shadows: 7, temperature: 23, tint: -2, vibrance: 18, saturation: 32, clarity: -16, grain: 14 },
  },
  {
    id: "fuji-1970s-summer",
    label: "1970's Summer",
    overrides: { contrast: 8, highlights: -20, shadows: -3, tint: -2, vibrance: -3, saturation: 2, clarity: -8, grain: 20 },
  },
  {
    id: "fuji-punch-punch",
    label: "punch punch",
    overrides: { exposure: 0.27, contrast: -3, highlights: 30, shadows: -14, tint: -2, vibrance: 15, saturation: 27, clarity: -5 },
  },
  {
    id: "fuji-bandw-documentary",
    label: "B&W Documentary",
    overrides: { contrast: -18, highlights: 20, shadows: 28, tint: -2, vibrance: 4, saturation: 12, clarity: 5, grain: 28 },
  },
  {
    id: "fuji-portra-by-maya",
    label: "Portra by Maya",
    overrides: { contrast: 9, highlights: -10, shadows: -14, tint: -1, vibrance: 11, saturation: 20, clarity: -8, grain: 28 },
  },
  {
    id: "fuji-reggies-portra",
    label: "Reggie's Portra",
    overrides: { highlights: -10, shadows: 7, tint: -1, vibrance: 11, saturation: 20, clarity: -8, grain: 14 },
  },
  {
    id: "fuji-luscious-greens",
    label: "Luscious Greens",
    overrides: { contrast: 3, highlights: -20, shadows: 7, temperature: 23, vibrance: 11, saturation: 15, clarity: -18, grain: 28 },
  },
  {
    id: "fuji-dreamland",
    label: "Dreamland",
    overrides: { contrast: 12, highlights: -20, shadows: -14, temperature: 18, tint: -1, vibrance: 4, saturation: 8, clarity: -11, grain: 14 },
  },
  {
    id: "fuji-soft-ember-cool",
    label: "Soft Ember (Cool)",
    overrides: { contrast: 9, highlights: -20, shadows: -7, tint: -1, vibrance: 9, saturation: 16, clarity: -16, grain: 14 },
  },
  {
    id: "fuji-zero-hour",
    label: "Zero Hour",
    overrides: { temperature: -10, tint: 1, vibrance: 18, saturation: 32, clarity: -34, grain: 14 },
  },
  {
    id: "fuji-pacific-blues",
    label: "Pacific Blues",
    overrides: { contrast: -3, highlights: -20, shadows: 21, tint: -1, vibrance: 18, saturation: 30, clarity: -8, grain: 20 },
  },
  {
    id: "fuji-portrait-chrome",
    label: "Portrait Chrome",
    overrides: { exposure: 0.2, temperature: 23, vibrance: 13, saturation: 19, clarity: -6 },
  },
  {
    id: "fuji-kodak-portra",
    label: "Kodak Portra",
    overrides: { contrast: -3, highlights: 10, tint: -1, vibrance: 15, saturation: 25, clarity: -24, grain: 34 },
  },
  {
    id: "fuji-the-recipe",
    label: "The Recipe",
    overrides: { exposure: 0.4, contrast: 9, highlights: -10, shadows: -14, temperature: 33, vibrance: 11, saturation: 18, clarity: -16, grain: 28 },
  },
  {
    id: "fuji-anime",
    label: "Anime",
    overrides: { vibrance: 18, saturation: 28, clarity: -8 },
  },
  {
    id: "fuji-after-rain",
    label: "After Rain",
    overrides: { contrast: -4, highlights: -5, shadows: 14, tint: -1, vibrance: 18, saturation: 30, clarity: -8, grain: 14 },
  },
  {
    id: "fuji-cashmere",
    label: "Cashmere",
    overrides: { contrast: 2, highlights: 5, shadows: -7, tint: -1, vibrance: 7, saturation: 12, clarity: -3, grain: 14 },
  },
  {
    id: "fuji-editorial-travel",
    label: "Editorial Travel",
    overrides: { contrast: 3, highlights: -20, shadows: 7, clarity: 7 },
  },
  {
    id: "fuji-cinematic-gold",
    label: "Cinematic Gold",
    overrides: { vibrance: 11, saturation: 15, clarity: -14, grain: 28 },
  },
  {
    id: "fuji-pastel-punch",
    label: "pastel punch",
    overrides: { exposure: 0.3, contrast: -3, highlights: -5, shadows: 11, temperature: 10, tint: -2, vibrance: 8, saturation: 15, clarity: -5 },
  },
  {
    id: "fuji-equinox-film-recipe",
    label: "Equinox Film Recipe",
    overrides: { contrast: -6, highlights: 5, shadows: 11, temperature: 13, tint: -1, vibrance: 18, saturation: 30, clarity: 4 },
  },
  {
    id: "fuji-anastasia",
    label: "Anastasia",
    overrides: { contrast: 9, highlights: -20, shadows: -7, vibrance: 13, saturation: 19, clarity: -1, grain: 28 },
  },
  {
    id: "fuji-classic-continental",
    label: "Classic Continental",
    overrides: { contrast: 5, highlights: -10, shadows: -3, tint: -1, vibrance: 6, saturation: 11, clarity: -4, grain: 14 },
  },
  {
    id: "fuji-summer-marle",
    label: "Summer Marle",
    overrides: { contrast: 3, highlights: -20, shadows: 7, tint: -2, vibrance: 18, saturation: 32, clarity: -2, grain: 14 },
  },
  {
    id: "fuji-vintage-postcards",
    label: "Vintage Postcards",
    overrides: { exposure: -0.4, contrast: 6, highlights: -10, shadows: -7, temperature: 33, tint: -1, vibrance: -3, saturation: -5, clarity: -18, grain: 14 },
  },
  {
    id: "fuji-x100v-daylight-neg",
    label: "X100V Daylight Neg",
    overrides: { temperature: 8, tint: -1, vibrance: 9, saturation: 14, clarity: -18, grain: 20 },
  },
  {
    id: "fuji-rustic-glow",
    label: "Rustic Glow",
    overrides: { contrast: -9, highlights: 20, shadows: 7, tint: -1, vibrance: 18, saturation: 30, clarity: -10 },
  },
  {
    id: "fuji-lisas-portra",
    label: "Lisa's Portra",
    overrides: { contrast: 8, highlights: -15, shadows: -7, temperature: 8, tint: -1, vibrance: -1, saturation: 1, clarity: -7, grain: 14 },
  },
  {
    id: "fuji-modified-ultramax400",
    label: "Modified UltraMax400",
    overrides: { temperature: 25, vibrance: 16, saturation: 24, clarity: -13, grain: 14 },
  },
  {
    id: "fuji-ultramax-400",
    label: "UltraMax 400",
    overrides: { exposure: 0.27, contrast: -6, highlights: 10, shadows: 7, temperature: 15, tint: -3, vibrance: 16, saturation: 26, clarity: 11, grain: 34 },
  },
  {
    id: "fuji-springfield",
    label: "Springfield",
    overrides: { contrast: -6, highlights: 10, shadows: 7, tint: -1, vibrance: 16, saturation: 26, clarity: -4, grain: 34 },
  },
  {
    id: "fuji-monopop",
    label: "monopop",
    overrides: { contrast: -24, highlights: 40, shadows: 28, vibrance: 4, saturation: 8, clarity: 4 },
  },
  {
    id: "fuji-kodak-tri-x-400",
    label: "Kodak TRI-X 400",
    overrides: { contrast: -9, shadows: 21, vibrance: 18, saturation: 28, clarity: -15, grain: 34 },
  },
  {
    id: "fuji-kentmere-pan-400",
    label: "Kentmere Pan 400",
    overrides: { contrast: -6, highlights: 10, shadows: 7, clarity: 9, grain: 20 },
  },
];
