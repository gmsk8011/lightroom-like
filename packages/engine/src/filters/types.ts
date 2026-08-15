import type { Filters } from "../recipe/schema";

export type FilterGroup = "light" | "color" | "effects";

/**
 * Filters run in one of two colour spaces. Tone and colour work happens in
 * linear light, where doubling a value means doubling the photons — that is
 * what makes exposure and contrast behave like a camera rather than like a
 * paint program. Vignette and grain are display-referred effects and run
 * after the encode back to sRGB.
 */
export type ColorSpace = "linear" | "display";

export interface FilterDefinition {
  /** Must match a numeric key of `Filters` — that is how values are bound. */
  id: Exclude<keyof Filters, "preset">;
  label: string;
  group: FilterGroup;
  space: ColorSpace;
  /** Lower runs earlier. Ordering is the pipeline. */
  order: number;
  min: number;
  max: number;
  step: number;
  precision: number;
  defaultValue: number;
  /**
   * GLSL executed with `vec3 c` (the working colour) and `float v` (this
   * filter's value) in scope. Assign back to `c`.
   */
  glsl: string;
  /** Set when the snippet samples `u_blur`, so the blur pass is scheduled. */
  needsBlur?: boolean;
}

/** The uniform name a definition's value is uploaded to. */
export function uniformName(id: string): string {
  return `u_${id}`;
}
