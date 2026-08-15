"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  collageCanvasSize,
  computeCollageLayout,
  DEFAULT_FILTERS,
  FilterRenderer,
  renderCollage,
  resolveCollageSources,
  type CollageCellInput,
  type CollageCellRect,
} from "@lrl/engine";
import { cn } from "@lrl/ui";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import { useCollageStore } from "@/stores/collage-store";
import { collageBitmaps } from "@/lib/collage/bitmaps";

/** Baseline used only to resolve the collage's on-screen aspect ratio —
 *  the actual rendered pixel size is derived from the container box, not
 *  this number. */
const LAYOUT_PROBE_EDGE = 1000;

interface View {
  displayWidth: number;
  displayHeight: number;
  left: number;
  top: number;
}

export function CollageCanvas() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const glCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<FilterRenderer | null>(null);
  const drawIdRef = React.useRef(0);

  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [view, setView] = React.useState<View | null>(null);
  const [cellRects, setCellRects] = React.useState<CollageCellRect[]>([]);

  const collage = useCollageStore((s) => s.collage);
  const selectedCells = useCollageStore((s) => s.selectedCells);
  const selectCell = useCollageStore((s) => s.selectCell);
  const byId = useCatalogStore((s) => s.byId);
  // Whole-map subscription — a collage cell can reference any photo's
  // filters, and there's no cheaper selector than "did any recipe change"
  // short of diffing every referenced id by hand.
  const recipes = useRecipeStore((s) => s.recipes);

  /* -------------------------------------------------------------- renderer */

  React.useEffect(() => {
    const glCanvas = document.createElement("canvas");
    glCanvasRef.current = glCanvas;
    const renderer = FilterRenderer.create(glCanvas);
    rendererRef.current = renderer;
    return () => {
      renderer?.dispose();
      rendererRef.current = null;
      glCanvasRef.current = null;
      collageBitmaps.clear();
    };
  }, []);

  /* ---------------------------------------------------------------- sizing */

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setBox({ width: rect.width, height: rect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* ---------------------------------------------------------------- draw */

  React.useEffect(() => {
    const renderer = rendererRef.current;
    const glCanvas = glCanvasRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !glCanvas || !canvas) return;
    if (box.width === 0 || box.height === 0) return;

    const myId = ++drawIdRef.current;

    void (async () => {
      const probe = collageCanvasSize(
        collage.aspect,
        collage.rows,
        collage.cols,
        LAYOUT_PROBE_EDGE,
      );
      const fit = Math.min(box.width / probe.width, box.height / probe.height, 1);
      const displayWidth = probe.width * fit;
      const displayHeight = probe.height * fit;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const canvasWidth = Math.max(1, Math.round(displayWidth * dpr));
      const canvasHeight = Math.max(1, Math.round(displayHeight * dpr));

      const cellInputs: (CollageCellInput | null)[] = [];
      const referencedIds = new Set<string>();
      for (const cell of collage.cells) {
        if (!cell.photoId) {
          cellInputs.push(null);
          continue;
        }
        const photo = byId[cell.photoId];
        if (!photo) {
          cellInputs.push(null);
          continue;
        }
        referencedIds.add(photo.id);
        const bitmap = await collageBitmaps.get(photo);
        if (myId !== drawIdRef.current) return;
        cellInputs.push({
          bitmap,
          filters: recipes[photo.id]?.filters ?? DEFAULT_FILTERS,
        });
      }

      collageBitmaps.pruneExcept(referencedIds);

      const { sources, snapshots } = await resolveCollageSources(
        cellInputs,
        () => renderer,
        glCanvas,
      );
      if (myId !== drawIdRef.current) {
        for (const snapshot of snapshots) snapshot.close();
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        for (const snapshot of snapshots) snapshot.close();
        return;
      }

      renderCollage({ ctx, collage, canvasWidth, canvasHeight, sources });
      for (const snapshot of snapshots) snapshot.close();

      canvas.style.width = `${Math.round(displayWidth)}px`;
      canvas.style.height = `${Math.round(displayHeight)}px`;

      setView({
        displayWidth,
        displayHeight,
        left: Math.round((box.width - displayWidth) / 2),
        top: Math.round((box.height - displayHeight) / 2),
      });
      setCellRects(computeCollageLayout(collage, displayWidth, displayHeight).cells);
    })();
  }, [collage, recipes, byId, box]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{
          width: view?.displayWidth ?? 0,
          height: view?.displayHeight ?? 0,
          left: view?.left ?? 0,
          top: view?.top ?? 0,
          visibility: view ? "visible" : "hidden",
        }}
      />

      {view && (
        <div
          className="absolute"
          style={{
            width: view.displayWidth,
            height: view.displayHeight,
            left: view.left,
            top: view.top,
          }}
        >
          {cellRects.map((cell, index) => {
            const filled = collage.cells[index]?.photoId != null;
            const selected = selectedCells.includes(index);
            return (
              <button
                key={index}
                type="button"
                aria-label={filled ? `Collage cell ${index + 1}` : `Empty collage cell ${index + 1}`}
                onClick={(e) => selectCell(index, e.shiftKey)}
                className={cn(
                  "absolute grid place-items-center transition-colors",
                  selected && "outline outline-2 outline-offset-[-2px] outline-accent",
                  !filled && "border border-dashed border-line/70 bg-raised/40 hover:bg-raised/70",
                )}
                style={{
                  left: cell.x,
                  top: cell.y,
                  width: cell.width,
                  height: cell.height,
                }}
              >
                {!filled && <Plus size={18} className="text-faint" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
