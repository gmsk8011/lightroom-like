import type { FilterDefinition } from "../types";

export const COLOR_FILTERS: FilterDefinition[] = [
  {
    id: "temperature",
    label: "Temperature",
    group: "color",
    space: "linear",
    order: 40,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    // Positive is warmer: red up, blue down, green untouched.
    glsl: `
      c.r *= 1.0 + v / 220.0;
      c.b *= 1.0 - v / 220.0;
    `,
  },
  {
    id: "tint",
    label: "Tint",
    group: "color",
    space: "linear",
    order: 41,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    // Positive is magenta, negative green — the axis perpendicular to warmth.
    glsl: `
      c.g *= 1.0 - v / 300.0;
      c.r *= 1.0 + v / 600.0;
      c.b *= 1.0 + v / 600.0;
    `,
  },
  {
    id: "vibrance",
    label: "Vibrance",
    group: "color",
    space: "linear",
    order: 50,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    // Weighted by how unsaturated a pixel already is, so skin tones stay put
    // while flat colours come up.
    glsl: `
      float l = luma(c);
      float sat = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
      float amount = (v / 100.0) * (1.0 - smoothstep(0.0, 0.6, sat));
      c = mix(vec3(l), c, 1.0 + amount);
    `,
  },
  {
    id: "saturation",
    label: "Saturation",
    group: "color",
    space: "linear",
    order: 51,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    glsl: `
      float l = luma(c);
      c = mix(vec3(l), c, 1.0 + v / 100.0);
    `,
  },
];
