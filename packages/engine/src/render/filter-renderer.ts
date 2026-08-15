import type { Filters } from "../recipe/schema";
import { registerBuiltinFilters } from "../filters/builtin";
import { listFilters } from "../filters/registry";
import { uniformName } from "../filters/types";
import {
  BLUR_FRAGMENT_SHADER,
  buildFragmentShader,
  VERTEX_SHADER_NEUTRAL,
  VERTEX_SHADER_PRESENT,
} from "./glsl";

export type RenderCanvas = HTMLCanvasElement | OffscreenCanvas;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log ?? "unknown error"}`);
  }
  return shader;
}

function link(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log ?? "unknown error"}`);
  }
  return program;
}

interface RenderTarget {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

/**
 * Renders a source image through the registered filter chain onto a canvas.
 * The same class backs both the live preview and full-resolution export — the
 * only difference is the canvas it is handed, which is what guarantees the
 * exported pixels match what was on screen.
 */
export class FilterRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly mainProgram: WebGLProgram;
  private readonly blurProgram: WebGLProgram;
  private readonly quad: WebGLVertexArrayObject;
  private readonly usesBlur: boolean;
  private readonly uniformCache = new Map<string, WebGLUniformLocation | null>();

  private sourceTexture: WebGLTexture | null = null;
  private sourceWidth = 0;
  private sourceHeight = 0;
  private blurTargets: [RenderTarget, RenderTarget] | null = null;

  private constructor(
    readonly canvas: RenderCanvas,
    gl: WebGL2RenderingContext,
  ) {
    this.gl = gl;

    registerBuiltinFilters();
    const built = buildFragmentShader();
    this.usesBlur = built.usesBlur;

    this.mainProgram = link(gl, VERTEX_SHADER_PRESENT, built.source);
    this.blurProgram = link(gl, VERTEX_SHADER_NEUTRAL, BLUR_FRAGMENT_SHADER);

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Could not create vertex array");
    this.quad = vao;
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  static create(canvas: RenderCanvas): FilterRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      // Export reads this canvas back after rendering, so the buffer must
      // survive past the frame it was drawn in.
      preserveDrawingBuffer: true,
      desynchronized: false,
    }) as WebGL2RenderingContext | null;

    if (!gl) return null;
    return new FilterRenderer(canvas, gl);
  }

  private uniform(
    program: WebGLProgram,
    name: string,
  ): WebGLUniformLocation | null {
    const cacheKey = `${program === this.mainProgram ? "m" : "b"}:${name}`;
    if (!this.uniformCache.has(cacheKey)) {
      this.uniformCache.set(cacheKey, this.gl.getUniformLocation(program, name));
    }
    return this.uniformCache.get(cacheKey) ?? null;
  }

  setSource(bitmap: ImageBitmap): void {
    const gl = this.gl;

    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);

    const texture = gl.createTexture();
    if (!texture) throw new Error("Could not create texture");

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Mipmaps matter for the preview, where a 6000px photo is shown in a
    // 900px viewport; without them the downscale aliases badly.
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.generateMipmap(gl.TEXTURE_2D);

    this.sourceTexture = texture;
    this.sourceWidth = bitmap.width;
    this.sourceHeight = bitmap.height;

    this.disposeBlurTargets();
  }

  get sourceSize(): { width: number; height: number } {
    return { width: this.sourceWidth, height: this.sourceHeight };
  }

  /** Largest edge the GPU can hold in one texture — export checks this before
   *  attempting a full-resolution pass. */
  get maxTextureSize(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  private createTarget(width: number, height: number): RenderTarget {
    const gl = this.gl;
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) {
      throw new Error("Could not create render target");
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { framebuffer, texture, width, height };
  }

  private ensureBlurTargets(): [RenderTarget, RenderTarget] {
    if (this.blurTargets) return this.blurTargets;
    // Half resolution: the clarity reference is a heavy blur, so the detail
    // lost to downsampling is detail the blur would have removed anyway.
    const width = Math.max(1, Math.floor(this.sourceWidth / 2));
    const height = Math.max(1, Math.floor(this.sourceHeight / 2));
    this.blurTargets = [
      this.createTarget(width, height),
      this.createTarget(width, height),
    ];
    return this.blurTargets;
  }

  private disposeBlurTargets(): void {
    if (!this.blurTargets) return;
    const gl = this.gl;
    for (const target of this.blurTargets) {
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    }
    this.blurTargets = null;
  }

  private runBlurPasses(): WebGLTexture {
    const gl = this.gl;
    const [first, second] = this.ensureBlurTargets();

    gl.useProgram(this.blurProgram);
    gl.bindVertexArray(this.quad);
    gl.uniform1i(this.uniform(this.blurProgram, "u_image"), 0);
    gl.activeTexture(gl.TEXTURE0);

    // Horizontal, reading the full-resolution source.
    gl.bindFramebuffer(gl.FRAMEBUFFER, first.framebuffer);
    gl.viewport(0, 0, first.width, first.height);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform2f(
      this.uniform(this.blurProgram, "u_direction"),
      1 / first.width,
      0,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Vertical, reading the horizontal result.
    gl.bindFramebuffer(gl.FRAMEBUFFER, second.framebuffer);
    gl.viewport(0, 0, second.width, second.height);
    gl.bindTexture(gl.TEXTURE_2D, first.texture);
    gl.uniform2f(
      this.uniform(this.blurProgram, "u_direction"),
      0,
      1 / second.height,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return second.texture;
  }

  /** Resizes the output canvas. Preview uses viewport size, export uses full. */
  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  render(filters: Filters): void {
    const gl = this.gl;
    if (!this.sourceTexture) return;

    const needsBlur =
      this.usesBlur && listFilters().some((f) => f.needsBlur && filters[f.id] !== 0);
    const blurTexture = needsBlur ? this.runBlurPasses() : null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.mainProgram);
    gl.bindVertexArray(this.quad);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(this.uniform(this.mainProgram, "u_image"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurTexture ?? this.sourceTexture);
    gl.uniform1i(this.uniform(this.mainProgram, "u_blur"), 1);

    gl.uniform2f(
      this.uniform(this.mainProgram, "u_resolution"),
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform1f(
      this.uniform(this.mainProgram, "u_aspect"),
      this.sourceHeight === 0 ? 1 : this.sourceWidth / this.sourceHeight,
    );

    for (const definition of listFilters()) {
      gl.uniform1f(
        this.uniform(this.mainProgram, uniformName(definition.id)),
        filters[definition.id],
      );
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    const gl = this.gl;
    this.disposeBlurTargets();
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
    gl.deleteProgram(this.mainProgram);
    gl.deleteProgram(this.blurProgram);
    gl.deleteVertexArray(this.quad);
    this.uniformCache.clear();
  }
}
