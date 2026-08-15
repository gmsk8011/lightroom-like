import { DEFAULT_FILTERS } from "../recipe/defaults";
import type { Filters } from "../recipe/schema";
import { FUJIFILM_PRESETS } from "./fujifilm";

export type PresetGroup = "basic" | "fujifilm";

export interface FilterPreset {
  id: string;
  label: string;
  group?: PresetGroup;
  /** Only the values this look changes; everything else stays at default. */
  overrides: Partial<Omit<Filters, "preset">>;
}

const BASE_PRESETS: FilterPreset[] = [
  {
    id: "punch",
    label: "Punch",
    group: "basic",
    overrides: { contrast: 22, vibrance: 28, blacks: -12, clarity: 18 },
  },
  {
    id: "soft-film",
    label: "Soft Film",
    group: "basic",
    overrides: {
      contrast: -14,
      blacks: 18,
      highlights: -12,
      temperature: 8,
      saturation: -8,
      grain: 22,
    },
  },
  {
    id: "warm-gold",
    label: "Warm Gold",
    group: "basic",
    overrides: {
      exposure: 0.15,
      temperature: 26,
      tint: 6,
      vibrance: 16,
      highlights: -18,
    },
  },
  {
    id: "cool-matte",
    label: "Cool Matte",
    group: "basic",
    overrides: {
      temperature: -20,
      blacks: 22,
      contrast: -8,
      saturation: -12,
      vignette: 12,
    },
  },
  {
    id: "mono",
    label: "Mono",
    group: "basic",
    overrides: { saturation: -100, contrast: 18, clarity: 14 },
  },
  {
    id: "mono-deep",
    label: "Mono Deep",
    group: "basic",
    overrides: {
      saturation: -100,
      contrast: 34,
      blacks: -20,
      whites: 14,
      clarity: 24,
      vignette: 18,
    },
  },
  {
    id: "faded",
    label: "Faded",
    group: "basic",
    overrides: {
      blacks: 30,
      contrast: -22,
      saturation: -18,
      highlights: -10,
      grain: 12,
    },
  },
  {
    id: "airy",
    label: "Airy",
    group: "basic",
    overrides: {
      exposure: 0.35,
      shadows: 24,
      highlights: -14,
      temperature: 6,
      vibrance: 10,
    },
  },
];

export const BUILTIN_PRESETS: FilterPreset[] = [
  ...BASE_PRESETS,
  ...FUJIFILM_PRESETS.map((preset) => ({ ...preset, group: "fujifilm" as const })),
];

/** Applies a preset over the defaults, tagging the result with its id. */
export function applyPreset(preset: FilterPreset): Filters {
  return { ...DEFAULT_FILTERS, ...preset.overrides, preset: preset.id };
}

export function findPreset(id: string): FilterPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === id);
}
