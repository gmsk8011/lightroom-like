import { describe, expect, it, beforeAll } from "vitest";
import { registerBuiltinFrames } from "./builtin";
import { computeFrameLayout } from "./registry";
import { DEFAULT_BORDER } from "../recipe/defaults";
import type { Border } from "../recipe/schema";

function border(overrides: Partial<Border> = {}): Border {
  return { ...DEFAULT_BORDER, ...overrides };
}

beforeAll(() => {
  registerBuiltinFrames();
});

describe("computeFrameLayout", () => {
  it("adds an even border sized from the short edge", () => {
    // Short edge 500 → one unit is 5px → 10% is a 50px border.
    const layout = computeFrameLayout(
      border({ type: "solid", widthPct: 10 }),
      1000,
      500,
    );

    expect(layout.canvas).toEqual({ width: 1100, height: 600 });
    expect(layout.image).toEqual({ x: 50, y: 50, width: 1000, height: 500 });
  });

  it("keeps the border even on a portrait photo", () => {
    const layout = computeFrameLayout(
      border({ type: "solid", widthPct: 10 }),
      500,
      1000,
    );

    expect(layout.padding).toEqual({
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    });
  });

  it("pads out to a target aspect ratio without cropping", () => {
    const layout = computeFrameLayout(
      border({ type: "none", aspect: "1:1" }),
      1000,
      500,
    );

    expect(layout.canvas).toEqual({ width: 1000, height: 1000 });
    // The photo keeps its full size and is centred in the padding.
    expect(layout.image).toEqual({ x: 0, y: 250, width: 1000, height: 500 });
  });

  it("applies the border before the aspect padding", () => {
    const layout = computeFrameLayout(
      border({ type: "solid", widthPct: 10, aspect: "1:1" }),
      1000,
      500,
    );

    // Border first: 1100x600. Then squared off to 1100x1100.
    expect(layout.canvas).toEqual({ width: 1100, height: 1100 });
    expect(layout.padding.left).toBe(50);
    expect(layout.padding.top).toBe(50);
  });

  it("gives the polaroid frame a deeper chin than its margins", () => {
    const layout = computeFrameLayout(
      border({ type: "polaroid", widthPct: 5 }),
      1000,
      1000,
    );

    expect(layout.padding.bottom).toBeGreaterThan(layout.padding.top * 2);
    expect(layout.padding.left).toBe(layout.padding.top);
    expect(layout.padding.right).toBe(layout.padding.top);
  });

  it("runs film perforations along the long edges", () => {
    const landscape = computeFrameLayout(
      border({ type: "film", widthPct: 8 }),
      2000,
      1000,
    );
    expect(landscape.padding.top).toBeGreaterThan(landscape.padding.left);

    const portrait = computeFrameLayout(
      border({ type: "film", widthPct: 8 }),
      1000,
      2000,
    );
    expect(portrait.padding.left).toBeGreaterThan(portrait.padding.top);
  });

  it("never shrinks the canvas below the framed photo", () => {
    const extremes: [number, number][] = [
      [8000, 400],
      [400, 8000],
      [1, 1],
      [4000, 4000],
    ];

    for (const [width, height] of extremes) {
      for (const aspect of ["1:1", "16:9", "9:16", "4:5"] as const) {
        const layout = computeFrameLayout(
          border({ type: "solid", widthPct: 6, aspect }),
          width,
          height,
        );

        expect(layout.canvas.width).toBeGreaterThanOrEqual(layout.framed.width);
        expect(layout.canvas.height).toBeGreaterThanOrEqual(
          layout.framed.height,
        );
        expect(layout.image.x).toBeGreaterThanOrEqual(0);
        expect(layout.image.y).toBeGreaterThanOrEqual(0);
        expect(layout.image.x + layout.image.width).toBeLessThanOrEqual(
          layout.canvas.width,
        );
        expect(layout.image.y + layout.image.height).toBeLessThanOrEqual(
          layout.canvas.height,
        );
      }
    }
  });

  it("reserves extra room below the photo when a caption asks for it", () => {
    const plain = computeFrameLayout(border({ type: "solid" }), 1000, 1000);
    const withCaption = computeFrameLayout(
      border({ type: "solid" }),
      1000,
      1000,
      120,
    );

    expect(withCaption.padding.bottom - plain.padding.bottom).toBe(120);
    expect(withCaption.canvas.height - plain.canvas.height).toBe(120);
  });
});
