import { listFilters } from "../filters/registry";
import { uniformName } from "../filters/types";

/**
 * Orientation, stated once so the passes stay consistent:
 *
 * Textures are uploaded unflipped, so texture coordinate y=0 is the image's
 * top row. GL's framebuffer origin is bottom-left, so presenting that directly
 * would draw the photo upside down.
 *
 * Intermediate passes therefore use the neutral mapping, which preserves
 * "y=0 is the top of the image" in their output. Only the final pass flips,
 * and because every texture it samples shares the same convention, one flip at
 * the end is all that is needed.
 */
export const VERTEX_SHADER_NEUTRAL = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const VERTEX_SHADER_PRESENT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const COLOR_HELPERS = `
const vec3 LUMA_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);

float luma(vec3 c) {
  return dot(c, LUMA_WEIGHTS);
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
`;

/** Nine-tap separable Gaussian, used to build the clarity reference image. */
export const BLUR_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2 u_direction;

void main() {
  vec4 sum = texture(u_image, v_uv) * 0.2270270270;
  sum += (texture(u_image, v_uv + u_direction * 1.3846153846)
        + texture(u_image, v_uv - u_direction * 1.3846153846)) * 0.3162162162;
  sum += (texture(u_image, v_uv + u_direction * 3.2307692308)
        + texture(u_image, v_uv - u_direction * 3.2307692308)) * 0.0702702703;
  fragColor = sum;
}
`;

export interface BuiltShader {
  source: string;
  /** True when any registered filter samples the blurred texture. */
  usesBlur: boolean;
}

/**
 * Assembles the main fragment shader from the filter registry. Linear-light
 * snippets run first, then the encode back to sRGB, then display-referred
 * snippets — so a filter's declared colour space decides where it lands
 * without the renderer knowing anything about individual filters.
 */
export function buildFragmentShader(): BuiltShader {
  const filters = listFilters();
  const usesBlur = filters.some((f) => f.needsBlur);

  const uniforms = filters
    .map((f) => `uniform float ${uniformName(f.id)};`)
    .join("\n");

  const emit = (space: "linear" | "display") =>
    filters
      .filter((f) => f.space === space)
      .map(
        (f) => `  {
    float v = ${uniformName(f.id)};
${f.glsl
  .split("\n")
  .map((line) => (line.trim() ? `    ${line.trim()}` : ""))
  .join("\n")}
  }`,
      )
      .join("\n");

  const source = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_image;
uniform sampler2D u_blur;
uniform vec2 u_resolution;
uniform float u_aspect;
${uniforms}
${COLOR_HELPERS}
void main() {
  vec4 src = texture(u_image, v_uv);
  vec3 c = srgbToLinear(src.rgb);

${emit("linear")}

  c = linearToSrgb(c);

${emit("display")}

  fragColor = vec4(clamp(c, 0.0, 1.0), src.a);
}
`;

  return { source, usesBlur };
}
