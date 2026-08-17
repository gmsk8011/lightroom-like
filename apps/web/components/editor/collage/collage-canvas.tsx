"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  collageCanvasSize,
  computeCollageLayout,
  coverFit,
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
import { PHOTO_DRAG_TYPE } from "@/lib/collage/drag";

/** Baseline used only to resolve the collage's on-screen aspect ratio —
 *  the actual rendered pixel size is derived from the container box, not
 *  this number. */
const LAYOUT_PROBE_EDGE = 1000;

/** Pointer movement below this, in screen px, still counts as a click
 *  rather than the start of a pan/move gesture. */
const DRAG_THRESHOLD = 4;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface View {
  displayWidth: number;
  displayHeight: number;
  left: number;
  top: number;
}

interface DragState {
  index: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  shiftKey: boolean;
  moved: boolean;
  /** Cell index currently under the pointer, once the drag has moved past
   *  another cell — null while still over the source cell or over nothing. */
  overIndex: number | null;
  /** Only set for a filled cell — an empty cell can still be click-selected
   *  but has nothing to pan or drag elsewhere. */
  pan: {
    startOffsetX: number;
    startOffsetY: number;
    zoom: number;
    sourceWidth: number;
    sourceHeight: number;
    cellWidth: number;
    cellHeight: number;
  } | null;
}

export function CollageCanvas() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const glCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<FilterRenderer | null>(null);
  const drawIdRef = React.useRef(0);
  const dragRef = React.useRef<DragState | null>(null);

  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [view, setView] = React.useState<View | null>(null);
  const [cellRects, setCellRects] = React.useState<CollageCellRect[]>([]);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  // The actual decoded-bitmap dimensions behind each cell's last draw — not
  // Photo.width/height, which is null until a photo has been opened in the
  // single-photo editor at least once. Used for the pointer-drag pan math
  // so it always matches what's actually on screen.
  const [cellSourceDims, setCellSourceDims] = React.useState<
    ({ width: number; height: number } | null)[]
  >([]);

  const collage = useCollageStore((s) => s.collage);
  const selectedCells = useCollageStore((s) => s.selectedCells);
  const selectCell = useCollageStore((s) => s.selectCell);
  const setCellPhoto = useCollageStore((s) => s.setCellPhoto);
  const swapCells = useCollageStore((s) => s.swapCells);
  const setCellTransform = useCollageStore((s) => s.setCellTransform);
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
      const sourceDims: ({ width: number; height: number } | null)[] = [];
      const referencedIds = new Set<string>();
      for (const cell of collage.cells) {
        if (!cell.photoId) {
          cellInputs.push(null);
          sourceDims.push(null);
          continue;
        }
        const photo = byId[cell.photoId];
        if (!photo) {
          cellInputs.push(null);
          sourceDims.push(null);
          continue;
        }
        referencedIds.add(photo.id);
        const bitmap = await collageBitmaps.get(photo);
        if (myId !== drawIdRef.current) return;
        cellInputs.push({
          bitmap,
          filters: recipes[photo.id]?.filters ?? DEFAULT_FILTERS,
        });
        sourceDims.push({ width: bitmap.width, height: bitmap.height });
      }
      setCellSourceDims(sourceDims);

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

  /* --------------------------------------------------------------- wheel */
  // A single container-level listener, hit-tested against cellRects, rather
  // than one per cell — same convention preview-canvas.tsx uses for its own
  // wheel-to-zoom, and native: {passive:false} is needed either way to call
  // preventDefault() so the page itself doesn't scroll.

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      if (!view) return;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left - view.left;
      const y = event.clientY - rect.top - view.top;
      const cell = cellRects.find(
        (c) => x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height,
      );
      if (!cell) return;
      const index = cell.row * collage.cols + cell.col;
      if (!collage.cells[index]?.photoId) return;

      event.preventDefault();
      const delta = clamp(event.deltaY, -120, 120);
      const factor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
      const current = collage.cells[index]!.zoom;
      setCellTransform(index, { zoom: clamp(current * factor, MIN_ZOOM, MAX_ZOOM) });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [view, cellRects, collage, setCellTransform]);

  /* ------------------------------------------------------------- pointer */

  function cellIndexAt(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY);
    const target = el?.closest<HTMLElement>("[data-collage-cell-index]");
    if (!target) return null;
    const index = Number(target.dataset.collageCellIndex);
    return Number.isFinite(index) ? index : null;
  }

  function onCellPointerDown(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    const cell = collage.cells[index];
    const dims = cellSourceDims[index];
    const rect = cellRects[index];
    if (!cell || !rect) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      index,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      shiftKey: e.shiftKey,
      moved: false,
      overIndex: null,
      pan:
        cell.photoId && dims
          ? {
              startOffsetX: cell.offsetX,
              startOffsetY: cell.offsetY,
              zoom: cell.zoom,
              sourceWidth: dims.width,
              sourceHeight: dims.height,
              cellWidth: rect.width,
              cellHeight: rect.height,
            }
          : null,
    };
  }

  function onCellPointerMove(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    const drag = dragRef.current;
    if (!drag || drag.index !== index || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;

    const hitIndex = cellIndexAt(e.clientX, e.clientY);
    const overOther = hitIndex !== null && hitIndex !== index;
    drag.overIndex = overOther ? hitIndex : null;
    setDragOverIndex(drag.overIndex);

    // Only pan live while the pointer is still over its own cell — once it
    // crosses into another cell the gesture reads as "move this photo
    // there," and panning underneath that would just be visual noise. An
    // empty cell has nothing to pan (drag.pan is null) — dragging one just
    // tracks toward a possible move, handled entirely in pointer-up.
    if (overOther || !drag.pan) return;

    const { pan } = drag;
    const base = coverFit(pan.sourceWidth, pan.sourceHeight, pan.cellWidth, pan.cellHeight);
    const cropW = base.sWidth / pan.zoom;
    const cropH = base.sHeight / pan.zoom;
    const slackX = Math.max(0, pan.sourceWidth - cropW);
    const slackY = Math.max(0, pan.sourceHeight - cropH);
    const scaleX = cropW / pan.cellWidth;
    const scaleY = cropH / pan.cellHeight;

    const dOffsetX = slackX > 0 ? ((-dx * scaleX) / slackX) * 100 : 0;
    const dOffsetY = slackY > 0 ? ((-dy * scaleY) / slackY) * 100 : 0;

    setCellTransform(index, {
      offsetX: clamp(pan.startOffsetX + dOffsetX, -50, 50),
      offsetY: clamp(pan.startOffsetY + dOffsetY, -50, 50),
    });
  }

  function onCellPointerUp(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    const drag = dragRef.current;
    if (!drag || drag.index !== index || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragOverIndex(null);

    if (!drag.moved) {
      selectCell(index, drag.shiftKey);
      return;
    }

    if (drag.overIndex !== null) {
      // Revert the live pan applied while the pointer was still passing
      // through its own cell — the outcome of this gesture is a move, not
      // a reposition, so any incidental pan along the way shouldn't stick.
      if (drag.pan) {
        setCellTransform(index, {
          offsetX: drag.pan.startOffsetX,
          offsetY: drag.pan.startOffsetY,
        });
      }
      swapCells(index, drag.overIndex);
    }
    // Otherwise the pointer stayed within the cell (or ended over empty
    // space) — the live pan from onCellPointerMove is already the result.
  }

  function onCellDragOver(e: React.DragEvent<HTMLButtonElement>) {
    if (!e.dataTransfer.types.includes(PHOTO_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onCellDrop(e: React.DragEvent<HTMLButtonElement>, index: number) {
    const photoId = e.dataTransfer.getData(PHOTO_DRAG_TYPE);
    if (!photoId) return; // not our drag — let it fall through to file import
    e.preventDefault();
    e.stopPropagation();
    setCellPhoto(index, photoId);
  }

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
            const dragTarget = dragOverIndex === index;
            return (
              <button
                key={index}
                type="button"
                data-collage-cell-index={index}
                aria-label={filled ? `Collage cell ${index + 1}` : `Empty collage cell ${index + 1}`}
                onPointerDown={(e) => onCellPointerDown(e, index)}
                onPointerMove={(e) => onCellPointerMove(e, index)}
                onPointerUp={(e) => onCellPointerUp(e, index)}
                onPointerCancel={(e) => onCellPointerUp(e, index)}
                onDragOver={onCellDragOver}
                onDrop={(e) => onCellDrop(e, index)}
                className={cn(
                  "absolute grid touch-none place-items-center transition-colors",
                  filled ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  selected && "outline outline-2 outline-offset-[-2px] outline-accent",
                  dragTarget && "outline outline-2 outline-offset-[-2px] outline-accent/70",
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
