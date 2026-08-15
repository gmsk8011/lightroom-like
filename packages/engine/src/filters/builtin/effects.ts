import type { FilterDefinition } from "../types";

export const EFFECT_FILTERS: FilterDefinition[] = [
  {
    id: "denoise",
    label: "Denoise",
    group: "effects",
    space: "linear",
    order: 55,
    min: 0,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    needsBlur: true,
    // Smooths luminance only, not full RGB. u_blur is a blur of the raw
    // source, taken before this pass's earlier white-balance/vibrance/
    // saturation adjustments — blending c's colour straight toward it would
    // partly undo that grading and read as a saturation shift. Rescaling by
    // the luma ratio keeps c's already-graded hue and chroma exactly as they
    // were, denoising the way most raw tools' luminance-NR slider does,
    // while leaving colour (chroma) noise untouched — there's no separate
    // chroma-only pass in this pipeline.
    glsl: `
      float lumaCurrent = luma(c);
      float lumaBlurred = luma(srgbToLinear(texture(u_blur, v_uv).rgb));
      float lumaSmoothed = mix(lumaCurrent, lumaBlurred, v / 100.0);
      c *= lumaCurrent > 0.0005 ? lumaSmoothed / lumaCurrent : 1.0;
    `,
  },
  {
    id: "clarity",
    label: "Clarity",
    group: "effects",
    space: "linear",
    order: 60,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    needsBlur: true,
    // Unsharp mask on luminance only. Using the full RGB difference would
    // reintroduce colour that earlier filters removed — pushing clarity on a
    // desaturated photo would tint it back toward the original hues.
    glsl: `
      vec3 blurred = srgbToLinear(texture(u_blur, v_uv).rgb);
      float detail = luma(c) - luma(blurred);
      c = max(c + detail * (v / 100.0), vec3(0.0));
    `,
  },
  {
    id: "orton",
    label: "Orton Glow",
    group: "effects",
    space: "linear",
    order: 65,
    min: 0,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    needsBlur: true,
    // The classic darkroom trick: a blurred, deliberately brightened copy
    // of the frame screened back over the sharp original. Screen only ever
    // lightens, so the effect reads as a soft bloom around bright areas
    // rather than a flat haze over the whole image.
    glsl: `
      vec3 blurred = srgbToLinear(texture(u_blur, v_uv).rgb);
      vec3 glow = blurred * 1.5;
      vec3 screened = vec3(1.0) - (vec3(1.0) - c) * (vec3(1.0) - glow);
      c = mix(c, screened, v / 100.0);
    `,
  },
  {
    id: "vignette",
    label: "Vignette",
    group: "effects",
    space: "display",
    order: 100,
    min: -100,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    // Corrected for aspect so the falloff stays circular on wide crops.
    glsl: `
      vec2 offset = (v_uv - 0.5) * vec2(max(u_aspect, 1.0), max(1.0 / u_aspect, 1.0));
      float radius = length(offset) * 1.41421;
      c *= 1.0 - (v / 100.0) * smoothstep(0.3, 1.0, radius);
    `,
  },
  {
    id: "grain",
    label: "Grain",
    group: "effects",
    space: "display",
    order: 110,
    min: 0,
    max: 100,
    step: 1,
    precision: 0,
    defaultValue: 0,
    // Grain is tied to output pixels, not UV, so it stays the same apparent
    // size whether you are looking at a preview or a full-resolution export.
    glsl: `
      float n = fract(sin(dot(v_uv * u_resolution, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - 0.5) * (v / 100.0) * 0.16;
    `,
  },
];
