import { describe, expect, it } from "vitest";
import {
  collageCanvasSize,
  computeCollageLayout,
  coverFit,
  coverFitTransform,
} from "./layout";
import { createDefaultCollage } from "./defaults";
import type { Collage } from "./schema";

function collage(overrides: Partial<Collage> = {}): Collage {
  return { ...createDefaultCollage(), ...overrides };
}

describe("collageCanvasSize", () => {
  it("sizes a landscape ratio from the long edge", () => {
    expect(collageCanvasSize("16:9", 1, 2, 1600)).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it("sizes a portrait ratio from the long edge", () => {
    expect(collageCanvasSize("9:16", 1, 2, 1600)).toEqual({
      width: 900,
      height: 1600,
    });
  });

  it("falls back to the grid's own shape for a ratio-less aspect", () => {
    // 1 row, 3 cols → 3:1, a landscape ratio.
    expect(collageCanvasSize("original", 1, 3, 1500)).toEqual({
      width: 1500,
      height: 500,
    });
  });
});

describe("computeCollageLayout", () => {
  it("produces rows*cols cells", () => {
    const layout = computeCollageLayout(collage({ rows: 3, cols: 3 }), 900, 900);
    expect(layout.cells).toHaveLength(9);
  });

  it("tiles cells exactly when gap and border are zero", () => {
    const layout = computeCollageLayout(
      collage({ rows: 2, cols: 2, gapPct: 0, borderWidthPct: 0 }),
      1000,
      1000,
    );

    expect(layout.cells[0]).toMatchObject({ x: 0, y: 0, width: 500, height: 500 });
    expect(layout.cells[1]).toMatchObject({ x: 500, y: 0, width: 500, height: 500 });
    expect(layout.cells[2]).toMatchObject({ x: 0, y: 500, width: 500, height: 500 });
    expect(layout.cells[3]).toMatchObject({ x: 500, y: 500, width: 500, height: 500 });
  });

  it("shrinks cells symmetrically for gap and border, reserving both", () => {
    // Short edge 1000 → unit 10px. gapPct 5 → 50px gap. borderWidthPct 4 → 40px border.
    const layout = computeCollageLayout(
      collage({ rows: 1, cols: 2, gapPct: 5, borderWidthPct: 4 }),
      1000,
      1000,
    );

    expect(layout.borderWidth).toBe(40);
    expect(layout.gap).toBe(50);

    const [a, b] = layout.cells;
    expect(a!.x).toBe(40);
    expect(b!.x).toBe(a!.x + a!.width + layout.gap);
    // Both cells plus the gap fill exactly the space between the two borders.
    expect(b!.x + b!.width).toBeCloseTo(1000 - 40, 5);
  });

  it("never produces a negative-sized cell across extreme grids", () => {
    const grids: [number, number][] = [[1, 8], [8, 1], [3, 3], [8, 8]];
    for (const [rows, cols] of grids) {
      const layout = computeCollageLayout(
        collage({ rows, cols, gapPct: 10, borderWidthPct: 15 }),
        400,
        400,
      );
      for (const cell of layout.cells) {
        expect(cell.width).toBeGreaterThanOrEqual(0);
        expect(cell.height).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("coverFit", () => {
  it("crops the sides of a wide source into a square target", () => {
    const fit = coverFit(2000, 1000, 500, 500);
    expect(fit.sy).toBe(0);
    expect(fit.sHeight).toBe(1000);
    expect(fit.sx).toBeGreaterThan(0);
    expect(fit.sWidth).toBeCloseTo(1000, 5);
  });

  it("crops the top/bottom of a tall source into a square target", () => {
    const fit = coverFit(1000, 2000, 500, 500);
    expect(fit.sx).toBe(0);
    expect(fit.sWidth).toBe(1000);
    expect(fit.sy).toBeGreaterThan(0);
    expect(fit.sHeight).toBeCloseTo(1000, 5);
  });

  it("crops nothing when source and target share an aspect ratio", () => {
    const fit = coverFit(1600, 900, 800, 450);
    expect(fit).toEqual({ sx: 0, sy: 0, sWidth: 1600, sHeight: 900 });
  });
});

describe("coverFitTransform", () => {
  it("matches plain coverFit at zoom 1 and zero offset", () => {
    const base = coverFit(2000, 1000, 500, 500);
    const transformed = coverFitTransform(2000, 1000, 500, 500, 0, 0, 1);
    expect(transformed.sWidth).toBeCloseTo(base.sWidth, 5);
    expect(transformed.sHeight).toBeCloseTo(base.sHeight, 5);
    expect(transformed.sx).toBeCloseTo(base.sx, 5);
    expect(transformed.sy).toBeCloseTo(base.sy, 5);
  });

  it("shrinks the crop window as zoom increases", () => {
    const z1 = coverFitTransform(2000, 1000, 500, 500, 0, 0, 1);
    const z2 = coverFitTransform(2000, 1000, 500, 500, 0, 0, 2);
    expect(z2.sWidth).toBeCloseTo(z1.sWidth / 2, 5);
    expect(z2.sHeight).toBeCloseTo(z1.sHeight / 2, 5);
  });

  it("pans within the available slack on the already-cropped axis", () => {
    // 2000x1000 into a 500x500 (square) target crops horizontally at zoom 1,
    // leaving real slack in X — panning should move sx without touching sy.
    const left = coverFitTransform(2000, 1000, 500, 500, -50, 0, 1);
    const right = coverFitTransform(2000, 1000, 500, 500, 50, 0, 1);
    expect(left.sx).toBe(0);
    expect(right.sx).toBeCloseTo(2000 - right.sWidth, 5);
    expect(right.sx).toBeGreaterThan(left.sx);
    expect(left.sy).toBe(right.sy);
  });

  it("has no slack to pan on an axis coverFit didn't crop", () => {
    // Full height is already used at zoom 1 — vertical offset is a no-op.
    const top = coverFitTransform(2000, 1000, 500, 500, 0, -50, 1);
    const bottom = coverFitTransform(2000, 1000, 500, 500, 0, 50, 1);
    expect(top.sy).toBe(0);
    expect(bottom.sy).toBe(0);
    expect(top.sHeight).toBe(1000);
  });

  it("clamps offsets to the valid range", () => {
    const over = coverFitTransform(2000, 1000, 500, 500, 500, -500, 1);
    const right = coverFitTransform(2000, 1000, 500, 500, 50, 0, 1);
    expect(over.sx).toBeCloseTo(right.sx, 5);
    expect(over.sy).toBe(0);
  });
});
