import type { FilterDefinition } from "../types";

/**
 * Tonal controls, all in linear light. Each acts through a smooth luminance
 * mask rather than a hard threshold, so pushing one slider never leaves a
 * visible seam where its range ends.
 */
export const LIGHT_FILTERS: FilterDefinition[] = [
  {
    id: "exposure",
    label: "Exposure",
    group: "light",
    space: "linear",
    order: 10,
    min: -5,
    max: 5,
    step: 0.01,
    precision: 2,
    defaultValue: 0,
    // One unit is one stop, which is why this is exp2 and not a multiply.
    glsl: `c *= exp2(v);`,
  },
  {
    id: "contrast",
    label: "Contrast",
    group: "light",
    space: "linear",
    order: 20,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    // Pivoting on 18% grey keeps mid-grey fixed, so contrast doesn't also
    // shift overall brightness.
    glsl: `c = max(vec3(0.0), (c - 0.18) * (1.0 + v / 100.0) + 0.18);`,
  },
  {
    id: "highlights",
    label: "Highlights",
    group: "light",
    space: "linear",
    order: 30,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    glsl: `
      float mask = smoothstep(0.25, 1.0, luma(c));
      c *= 1.0 + (v / 100.0) * mask * 0.85;
    `,
  },
  {
    id: "shadows",
    label: "Shadows",
    group: "light",
    space: "linear",
    order: 31,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    glsl: `
      float mask = 1.0 - smoothstep(0.0, 0.45, luma(c));
      c *= 1.0 + (v / 100.0) * mask * 0.9;
    `,
  },
  {
    id: "whites",
    label: "Whites",
    group: "light",
    space: "linear",
    order: 32,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    glsl: `
      float mask = smoothstep(0.55, 1.15, luma(c));
      c *= 1.0 + (v / 100.0) * mask * 0.6;
    `,
  },
  {
    id: "blacks",
    label: "Blacks",
    group: "light",
    space: "linear",
    order: 33,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    // Blacks lift by addition rather than multiplication — scaling a value
    // near zero does nothing, which is why this slider needs an offset.
    glsl: `
      float mask = 1.0 - smoothstep(0.0, 0.28, luma(c));
      c += (v / 100.0) * 0.14 * mask;
    `,
  },
];
