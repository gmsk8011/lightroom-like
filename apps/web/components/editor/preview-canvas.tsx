"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import {
  aspectValue,
  captionBox,
  composite,
  computeFrameLayout,
  createDefaultRecipe,
  DEFAULT_BORDER,
  DEFAULT_FILTERS,
  FilterRenderer,
  measureCaption,
  type AspectRatio,
  type CaptionMetrics,
  type EditRecipe,
  type FrameLayout,
} from "@lrl/engine";
import { cn } from "@lrl/ui";
import { readPhotoFile } from "@/lib/catalog/import";
import type { Photo } from "@/lib/catalog/types";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import { useUiStore } from "@/stores/ui-store";

/** Beyond this the extra pixels are invisible on screen but cost real GPU
 *  time on every slider tick. */
const MAX_PREVIEW_EDGE = 2560;

/** Extra hit-test tolerance around a caption's box, in canvas-internal
 *  pixels, so a small caption is still easy to grab. */
const DRAG_HIT_PADDING = 10;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
/** Per-wheel-unit zoom factor exponent — see the wheel handler for why this
 *  is scaled by scroll distance instead of a fixed step. */
const WHEEL_ZOOM_SENSITIVITY = 0.0008;
const MIN_CROP_PCT = 5;
/** Hit-test tolerance around a crop handle, in canvas-internal pixels. */
const HANDLE_HIT_PADDING = 16;

interface PreviewCanvasProps {
  photo: Photo;
}

interface DrawInfo {
  layout: FrameLayout;
  captionMetrics: Record<string, CaptionMetrics>;
  scale: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** How much of the canvas's natural size to show at rest — capped at 1 so a
 *  small photo never gets upscaled just to fill the viewport. */
function fitScale(canvasW: number, canvasH: number, boxW: number, boxH: number): number {
  if (canvasW === 0 || canvasH === 0 || boxW === 0 || boxH === 0) return 1;
  return Math.min(boxW / canvasW, boxH / canvasH, 1);
}

/** Keeps the photo fully reachable without ever letting it be dragged
 *  entirely out of view. When the photo is smaller than the container this
 *  lets it be repositioned anywhere within the container's bounds instead of
 *  snapping back to dead centre; when it's larger, the usual "can't show
 *  past the edge" clamp applies. */
function clampPan(rawOffset: number, displaySize: number, boxSize: number): number {
  if (displaySize <= boxSize) return clamp(rawOffset, 0, boxSize - displaySize);
  return clamp(rawOffset, boxSize - displaySize, 0);
}

interface View {
  effectiveScale: number;
  displayWidth: number;
  displayHeight: number;
  left: number;
  top: number;
}

function computeView(
  canvasW: number,
  canvasH: number,
  box: { width: number; height: number },
  zoom: number | null,
  pan: { x: number; y: number },
): View {
  const effectiveScale = zoom ?? fitScale(canvasW, canvasH, box.width, box.height);
  const displayWidth = canvasW * effectiveScale;
  const displayHeight = canvasH * effectiveScale;
  const centerLeft = (box.width - displayWidth) / 2;
  const centerTop = (box.height - displayHeight) / 2;
  return {
    effectiveScale,
    displayWidth,
    displayHeight,
    left: clampPan(centerLeft + pan.x, displayWidth, box.width),
    top: clampPan(centerTop + pan.y, displayHeight, box.height),
  };
}

/** photoWidth/photoHeight are the bitmap's own pixel dimensions — needed so
 *  a "1:1" or "16:9" aspect lock is correct in real pixels even though the
 *  crop rect itself is stored as percent of (possibly non-square) width and
 *  height axes independently. */
function fitAspect(
  rect: Crop2,
  ratio: number,
  photoWidth: number,
  photoHeight: number,
): Crop2 {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  // Prefer keeping the current width, unless that would make the height
  // spill outside the photo, in which case pin height instead.
  let width = rect.width;
  let height = (width * photoWidth) / ratio / photoHeight;
  if (height > 100) {
    height = 100;
    width = (height * photoHeight * ratio) / photoWidth;
  }
  let x = clamp(centerX - width / 2, 0, 100 - width);
  let y = clamp(centerY - height / 2, 0, 100 - height);
  return { x, y, width, height };
}

type Crop2 = { x: number; y: number; width: number; height: number };
type CropHandle = "nw" | "ne" | "sw" | "se" | "move";

const CROP_ASPECTS: { value: AspectRatio; label: string }[] = [
  { value: "original", label: "Free" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "5:4", label: "5:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

export function PreviewCanvas({ photo }: PreviewCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const glCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<FilterRenderer | null>(null);
  const bitmapRef = React.useRef<ImageBitmap | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const lastDrawRef = React.useRef<DrawInfo | null>(null);
  const draggingCaptionIdRef = React.useRef<string | null>(null);
  const panningRef = React.useRef(false);
  const panStartRef = React.useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });

  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [dragging, setDragging] = React.useState(false);
  const [zoom, setZoom] = React.useState<number | null>(null);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });

  const showOriginal = useUiStore((s) => s.showOriginal);
  const updatePhoto = useCatalogStore((s) => s.updatePhoto);
  const setSelectedCaptionId = useUiStore((s) => s.setSelectedCaptionId);

  /* ------------------------------------------------------------- crop */

  const cropMode = useUiStore((s) => s.cropMode);
  const setCropMode = useUiStore((s) => s.setCropMode);
  // The straighten angle lives in the shared ui-store, not local state, so
  // the Crop side panel can host its slider instead of the canvas overlay.
  const cropRotation = useUiStore((s) => s.cropRotation);
  const setCropRotation = useUiStore((s) => s.setCropRotation);
  const [cropRect, setCropRect] = React.useState<Crop2>({ x: 0, y: 0, width: 100, height: 100 });
  const [cropAspect, setCropAspect] = React.useState<AspectRatio>("original");
  const cropDragRef = React.useRef<{
    handle: CropHandle;
    startPointerPct: { x: number; y: number };
    startRect: Crop2;
  } | null>(null);
  const cropViewRef = React.useRef<{ scale: number; canvasW: number; canvasH: number } | null>(
    null,
  );
  // The floating toolbar is positioned relative to the canvas's own bounds,
  // not the container's — anchoring it to the container (like the zoom
  // toolbar) would let it sit on top of the crop rect's own corner handles
  // whenever the photo nearly fills the container, swallowing the drag.
  const [cropToolbarTop, setCropToolbarTop] = React.useState(0);

  React.useEffect(() => {
    if (!cropMode) return;
    const existing = useRecipeStore.getState().recipes[photo.id]?.crop;
    setCropRect(existing ? { ...existing } : { x: 0, y: 0, width: 100, height: 100 });
    setCropAspect("original");
    setCropRotation(existing?.rotation ?? 0);
    setZoom(null);
    setPan({ x: 0, y: 0 });
  }, [cropMode, photo.id]);

  /* ---------------------------------------------------------- renderer */

  React.useEffect(() => {
    // The filter pass renders to its own offscreen canvas; the visible canvas
    // is 2D, because frames and captions are drawing operations, not shaders.
    const glCanvas = document.createElement("canvas");
    glCanvasRef.current = glCanvas;

    const renderer = FilterRenderer.create(glCanvas);
    if (!renderer) {
      setError("This browser doesn't support WebGL2");
      return;
    }
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      glCanvasRef.current = null;
    };
  }, []);

  /* ------------------------------------------------------------ source */

  React.useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setZoom(null);
    setPan({ x: 0, y: 0 });

    const current = useCatalogStore.getState().byId[photo.id];
    if (!current) return;

    void readPhotoFile(current)
      .then((file) => createImageBitmap(file))
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current?.close();
        bitmapRef.current = bitmap;
        rendererRef.current?.setSource(bitmap);

        updatePhoto(photo.id, {
          width: bitmap.width,
          height: bitmap.height,
          aspect: bitmap.width / bitmap.height,
        });
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not decode photo");
      });

    return () => {
      cancelled = true;
    };
  }, [photo.id, updatePhoto]);

  React.useEffect(() => {
    return () => {
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, []);

  /* ------------------------------------------------------------ layout */

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

  /* ------------------------------------------------------------ render */

  const draw = React.useCallback(
    (recipe: EditRecipe) => {
      const renderer = rendererRef.current;
      const glCanvas = glCanvasRef.current;
      const bitmap = bitmapRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !glCanvas || !bitmap || !canvas || box.width === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Full-resolution geometry first, so the on-screen scale is derived from
      // the same numbers the export will use. The crop (if any) is folded in
      // here too, matching how composite() derives it internally.
      const crop = recipe.crop;
      const photoWidth = bitmap.width * ((crop ? crop.width : 100) / 100);
      const photoHeight = bitmap.height * ((crop ? crop.height : 100) / 100);
      const full = computeFrameLayout(recipe.border, photoWidth, photoHeight);

      const view = computeView(full.canvas.width, full.canvas.height, box, zoom, pan);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const quality = Math.min(
        dpr,
        MAX_PREVIEW_EDGE / Math.max(view.displayWidth, view.displayHeight),
      );
      const scale = view.effectiveScale * Math.max(quality, 0.1);

      renderer.setSize(bitmap.width * scale, bitmap.height * scale);
      renderer.render(recipe.filters);

      const layout = composite({
        ctx,
        source: glCanvas,
        sourceWidth: bitmap.width,
        sourceHeight: bitmap.height,
        recipe,
        scale,
      });

      canvas.style.width = `${Math.round(view.displayWidth)}px`;
      canvas.style.height = `${Math.round(view.displayHeight)}px`;
      canvas.style.left = `${Math.round(view.left)}px`;
      canvas.style.top = `${Math.round(view.top)}px`;

      // Reused for hit-testing drag gestures against each caption's box —
      // computed with the same inputs composite() used internally, so it
      // matches exactly what's on screen.
      const captionMetrics: Record<string, CaptionMetrics> = {};
      for (const caption of recipe.captions) {
        const metrics = measureCaption(ctx, caption, photoWidth, photoHeight);
        if (metrics) captionMetrics[caption.id] = metrics;
      }
      lastDrawRef.current = { layout, captionMetrics, scale };
    },
    [box, zoom, pan],
  );

  /**
   * Slider drags fire far faster than the GPU can draw, so renders are
   * coalesced onto animation frames — the canvas always shows the newest
   * values without queueing stale frames behind them.
   */
  const schedule = React.useCallback(
    (recipe: EditRecipe) => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        draw(recipe);
      });
    },
    [draw],
  );

  React.useEffect(() => {
    if (!ready || cropMode) return;

    const current =
      useRecipeStore.getState().recipes[photo.id] ?? createDefaultRecipe();
    // Comparing to the original means no filters and no frame — the photo
    // exactly as it came off the disk.
    const shown: EditRecipe = showOriginal
      ? { ...current, filters: DEFAULT_FILTERS, border: DEFAULT_BORDER, crop: null }
      : current;
    schedule(shown);

    if (showOriginal) return;
    // Whole-store subscribe (Zustand core has no selector-subscribe without
    // the subscribeWithSelector middleware) — cheap to filter here since
    // recipe edits aren't a hot path the way slider drags on filters are.
    return useRecipeStore.subscribe((state) => {
      const recipe = state.recipes[photo.id];
      if (recipe) schedule(recipe);
    });
  }, [photo.id, ready, showOriginal, schedule, cropMode]);

  React.useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /* ------------------------------------------------------- crop render */

  const drawCropMode = React.useCallback(() => {
    const renderer = rendererRef.current;
    const glCanvas = glCanvasRef.current;
    const bitmap = bitmapRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !glCanvas || !bitmap || !canvas || box.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = Math.min(
      fitScale(bitmap.width, bitmap.height, box.width, box.height),
      Math.min(window.devicePixelRatio || 1, 2),
    );
    const filters = useRecipeStore.getState().recipes[photo.id]?.filters ?? DEFAULT_FILTERS;
    renderer.setSize(bitmap.width * scale, bitmap.height * scale);
    renderer.render(filters);

    const canvasW = Math.round(bitmap.width * scale);
    const canvasH = Math.round(bitmap.height * scale);
    canvas.width = canvasW;
    canvas.height = canvasH;
    const displayW = bitmap.width * fitScale(bitmap.width, bitmap.height, box.width, box.height);
    const displayH = bitmap.height * fitScale(bitmap.width, bitmap.height, box.width, box.height);
    canvas.style.width = `${Math.round(displayW)}px`;
    canvas.style.height = `${Math.round(displayH)}px`;
    canvas.style.left = `${Math.round((box.width - displayW) / 2)}px`;
    canvas.style.top = `${Math.round((box.height - displayH) / 2)}px`;

    // Straightening is previewed here exactly as compositor.ts applies it:
    // rotate the whole photo about its own centre into a same-size scratch
    // canvas first, so the crop rect (dim mask, grid, handles) and the final
    // export always agree on what "rotated" looks like.
    let rotatedGlCanvas: CanvasImageSource = glCanvas;
    if (cropRotation !== 0) {
      const rotated = new OffscreenCanvas(canvasW, canvasH);
      const rotatedCtx = rotated.getContext("2d");
      if (rotatedCtx) {
        rotatedCtx.translate(canvasW / 2, canvasH / 2);
        rotatedCtx.rotate((cropRotation * Math.PI) / 180);
        rotatedCtx.drawImage(glCanvas, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
        rotatedGlCanvas = rotated;
      }
    }

    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(rotatedGlCanvas, 0, 0, canvasW, canvasH);

    const rectX = (cropRect.x / 100) * canvasW;
    const rectY = (cropRect.y / 100) * canvasH;
    const rectW = (cropRect.width / 100) * canvasW;
    const rectH = (cropRect.height / 100) * canvasH;

    // Dim everything, then re-reveal the selected region at full brightness.
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(rotatedGlCanvas, rectX, rectY, rectW, rectH, rectX, rectY, rectW, rectH);

    // Rule-of-thirds grid inside the selection.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const gx = rectX + (rectW * i) / 3;
      ctx.beginPath();
      ctx.moveTo(gx, rectY);
      ctx.lineTo(gx, rectY + rectH);
      ctx.stroke();
      const gy = rectY + (rectH * i) / 3;
      ctx.beginPath();
      ctx.moveTo(rectX, gy);
      ctx.lineTo(rectX + rectW, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(rectX, rectY, rectW, rectH);

    const handleSize = 10;
    ctx.fillStyle = "#ffffff";
    const handlePoints: [number, number][] = [
      [rectX, rectY],
      [rectX + rectW, rectY],
      [rectX, rectY + rectH],
      [rectX + rectW, rectY + rectH],
    ];
    for (const [hx, hy] of handlePoints) {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    }

    cropViewRef.current = { scale, canvasW, canvasH };

    const canvasTop = (box.height - displayH) / 2;
    const canvasBottom = canvasTop + displayH;
    const toolbarHeight = 44;
    const gap = 12;
    const nextTop =
      box.height - canvasBottom >= toolbarHeight + gap
        ? canvasBottom + gap
        : Math.max(gap, canvasTop - toolbarHeight - gap);
    setCropToolbarTop((prev) => (Math.abs(prev - nextTop) < 0.5 ? prev : nextTop));
  }, [box, cropRect, cropRotation, photo.id]);

  React.useEffect(() => {
    if (!ready || !cropMode) return;
    drawCropMode();
  }, [ready, cropMode, drawCropMode]);

  const applyAspect = React.useCallback(
    (ratio: AspectRatio) => {
      setCropAspect(ratio);
      const bitmap = bitmapRef.current;
      const value = aspectValue(ratio);
      if (!bitmap || value === null) return;
      setCropRect((r) => fitAspect(r, value, bitmap.width, bitmap.height));
    },
    [],
  );

  const commitCrop = React.useCallback(() => {
    const isFull =
      cropRect.x <= 0.1 &&
      cropRect.y <= 0.1 &&
      cropRect.width >= 99.8 &&
      cropRect.height >= 99.8 &&
      cropRotation === 0;
    const store = useRecipeStore.getState();
    if (isFull) store.clearCrop(photo.id);
    else store.setCrop(photo.id, { ...cropRect, rotation: cropRotation });
    setCropMode(false);
  }, [cropRect, cropRotation, photo.id, setCropMode]);

  const cancelCrop = React.useCallback(() => {
    setCropMode(false);
  }, [setCropMode]);

  /* --------------------------------------------------- drag positioning */

  const canvasPoint = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      };
    },
    [],
  );

  const hitTestCaption = React.useCallback(
    (point: { x: number; y: number }): string | null => {
      const info = lastDrawRef.current;
      const captions = useRecipeStore.getState().recipes[photo.id]?.captions ?? [];
      if (!info) return null;
      // Last-drawn (last in the array) is topmost, so it wins on overlap.
      for (let i = captions.length - 1; i >= 0; i--) {
        const caption = captions[i];
        const metrics = caption && info.captionMetrics[caption.id];
        if (!caption || !metrics) continue;
        const target = captionBox(
          info.layout.canvas.width,
          info.layout.canvas.height,
          caption,
          metrics,
          info.scale,
        );
        if (
          point.x >= target.x - DRAG_HIT_PADDING &&
          point.x <= target.x + target.width + DRAG_HIT_PADDING &&
          point.y >= target.y - DRAG_HIT_PADDING &&
          point.y <= target.y + target.height + DRAG_HIT_PADDING
        ) {
          return caption.id;
        }
      }
      return null;
    },
    [photo.id],
  );

  /* ---------------------------------------------------------- crop hit */

  const cropHitTest = React.useCallback(
    (canvasX: number, canvasY: number): CropHandle | null => {
      const view = cropViewRef.current;
      if (!view) return null;
      const rectX = (cropRect.x / 100) * view.canvasW;
      const rectY = (cropRect.y / 100) * view.canvasH;
      const rectW = (cropRect.width / 100) * view.canvasW;
      const rectH = (cropRect.height / 100) * view.canvasH;
      const corners: [CropHandle, number, number][] = [
        ["nw", rectX, rectY],
        ["ne", rectX + rectW, rectY],
        ["sw", rectX, rectY + rectH],
        ["se", rectX + rectW, rectY + rectH],
      ];
      for (const [handle, hx, hy] of corners) {
        if (
          Math.abs(canvasX - hx) <= HANDLE_HIT_PADDING &&
          Math.abs(canvasY - hy) <= HANDLE_HIT_PADDING
        ) {
          return handle;
        }
      }
      if (canvasX >= rectX && canvasX <= rectX + rectW && canvasY >= rectY && canvasY <= rectY + rectH) {
        return "move";
      }
      return null;
    },
    [cropRect],
  );

  const onCropPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const view = cropViewRef.current;
      if (!canvas || !view) return;
      const rect = canvas.getBoundingClientRect();
      const canvasX = ((event.clientX - rect.left) / rect.width) * view.canvasW;
      const canvasY = ((event.clientY - rect.top) / rect.height) * view.canvasH;
      const handle = cropHitTest(canvasX, canvasY);
      if (!handle) return;
      event.preventDefault();
      cropDragRef.current = {
        handle,
        startPointerPct: { x: (canvasX / view.canvasW) * 100, y: (canvasY / view.canvasH) * 100 },
        startRect: { ...cropRect },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [cropHitTest, cropRect],
  );

  const onCropPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = cropDragRef.current;
      const canvas = canvasRef.current;
      const view = cropViewRef.current;
      const bitmap = bitmapRef.current;
      if (!drag || !canvas || !view || !bitmap) return;
      const rect = canvas.getBoundingClientRect();
      const pctX = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
      const pctY = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
      const dx = pctX - drag.startPointerPct.x;
      const dy = pctY - drag.startPointerPct.y;
      const start = drag.startRect;
      const lockRatio = aspectValue(cropAspect);

      let next: Crop2;
      if (drag.handle === "move") {
        next = {
          x: clamp(start.x + dx, 0, 100 - start.width),
          y: clamp(start.y + dy, 0, 100 - start.height),
          width: start.width,
          height: start.height,
        };
      } else {
        let x = start.x;
        let y = start.y;
        let width = start.width;
        let height = start.height;

        if (drag.handle === "se" || drag.handle === "ne") {
          width = clamp(start.width + dx, MIN_CROP_PCT, 100 - start.x);
        } else {
          const newX = clamp(start.x + dx, 0, start.x + start.width - MIN_CROP_PCT);
          width = start.width + (start.x - newX);
          x = newX;
        }
        if (drag.handle === "se" || drag.handle === "sw") {
          height = clamp(start.height + dy, MIN_CROP_PCT, 100 - start.y);
        } else {
          const newY = clamp(start.y + dy, 0, start.y + start.height - MIN_CROP_PCT);
          height = start.height + (start.y - newY);
          y = newY;
        }

        if (lockRatio !== null) {
          // Recompute height from width so the real-pixel ratio holds,
          // anchored at the corner opposite the one being dragged.
          height = (width * bitmap.width) / lockRatio / bitmap.height;
          if (drag.handle === "nw" || drag.handle === "ne") {
            y = start.y + start.height - height;
          }
          if (y < 0 || y + height > 100 || height < MIN_CROP_PCT) {
            height = clamp(height, MIN_CROP_PCT, 100);
            width = (height * bitmap.height * lockRatio) / bitmap.width;
            y = clamp(y, 0, 100 - height);
          }
        }

        next = { x, y, width, height };
      }

      setCropRect(next);
    },
    [cropAspect],
  );

  const endCropDrag = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cropDragRef.current) return;
    cropDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  /* -------------------------------------------------- normal pointer io */

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = canvasPoint(event);
      if (!point) return;

      const hitId = hitTestCaption(point);
      if (hitId) {
        event.preventDefault();
        draggingCaptionIdRef.current = hitId;
        setSelectedCaptionId(hitId);
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      // Dragging the photo works at any zoom level, not just when zoomed
      // past fit — clampPan still keeps it fully reachable rather than
      // letting it disappear off-screen.
      event.preventDefault();
      panningRef.current = true;
      panStartRef.current = { clientX: event.clientX, clientY: event.clientY, panX: pan.x, panY: pan.y };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canvasPoint, hitTestCaption, pan, setSelectedCaptionId],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (draggingCaptionIdRef.current) {
        const point = canvasPoint(event);
        if (!point) return;
        const info = lastDrawRef.current;
        if (!info) return;
        const x = clamp((point.x / info.layout.canvas.width) * 100, 0, 100);
        const y = clamp((point.y / info.layout.canvas.height) * 100, 0, 100);
        const store = useRecipeStore.getState();
        store.setCaption(photo.id, draggingCaptionIdRef.current, "positionX", x);
        store.setCaption(photo.id, draggingCaptionIdRef.current, "positionY", y);
        return;
      }

      if (panningRef.current) {
        const dx = event.clientX - panStartRef.current.clientX;
        const dy = event.clientY - panStartRef.current.clientY;
        setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      }
    },
    [canvasPoint, photo.id],
  );

  const endDrag = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingCaptionIdRef.current && !panningRef.current) return;
    draggingCaptionIdRef.current = null;
    panningRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  /* --------------------------------------------------------------- zoom */

  const zoomAt = React.useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const bitmap = bitmapRef.current;
      const container = containerRef.current;
      if (!bitmap || !container || box.width === 0) return;

      const recipe = useRecipeStore.getState().recipes[photo.id] ?? createDefaultRecipe();
      const crop = recipe.crop;
      const photoWidth = bitmap.width * ((crop ? crop.width : 100) / 100);
      const photoHeight = bitmap.height * ((crop ? crop.height : 100) / 100);
      const full = computeFrameLayout(recipe.border, photoWidth, photoHeight);

      const currentView = computeView(full.canvas.width, full.canvas.height, box, zoom, pan);
      const rect = container.getBoundingClientRect();
      const cursorX = clientX - rect.left;
      const cursorY = clientY - rect.top;
      const u = (cursorX - currentView.left) / currentView.displayWidth;
      const v = (cursorY - currentView.top) / currentView.displayHeight;

      const nextZoom = clamp(currentView.effectiveScale * factor, MIN_ZOOM, MAX_ZOOM);
      const nextDisplayWidth = full.canvas.width * nextZoom;
      const nextDisplayHeight = full.canvas.height * nextZoom;
      const nextCenterLeft = (box.width - nextDisplayWidth) / 2;
      const nextCenterTop = (box.height - nextDisplayHeight) / 2;
      const nextLeft = cursorX - u * nextDisplayWidth;
      const nextTop = cursorY - v * nextDisplayHeight;

      setZoom(nextZoom);
      setPan({ x: nextLeft - nextCenterLeft, y: nextTop - nextCenterTop });
    },
    [box, zoom, pan, photo.id],
  );

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || cropMode) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Scaled continuously by the actual scroll distance rather than a
      // fixed jump per event — a mouse's ~100-unit notch nudges the zoom a
      // few percent, and a trackpad's many small deltas during one gesture
      // add up smoothly instead of stair-stepping. The clamp keeps one
      // unusually large delta (a hard wheel flick) from jumping too far.
      const delta = clamp(event.deltaY, -120, 120);
      const factor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
      zoomAt(factor, event.clientX, event.clientY);
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [zoomAt, cropMode]);

  // No visible zoom toolbar — double-click is the only reset affordance,
  // so a zoomed-in photo is never stuck with no way back to Fit.
  const resetZoom = React.useCallback(() => {
    setZoom(null);
    setPan({ x: 0, y: 0 });
  }, []);

  /* -------------------------------------------------------------- view */

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
    >
      {error ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className="max-w-xs text-center text-xs leading-relaxed text-faint">
            {error}
          </p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="absolute shadow-2xl shadow-black/50"
          style={{
            opacity: ready ? 1 : 0,
            transition: "opacity 120ms",
            touchAction: "none",
            // The photo is draggable at every zoom level, so the hand
            // cursor applies everywhere except while actively cropping.
            cursor: cropMode ? "crosshair" : dragging ? "grabbing" : "grab",
          }}
          onPointerDown={cropMode ? onCropPointerDown : onPointerDown}
          onPointerMove={cropMode ? onCropPointerMove : onPointerMove}
          onPointerUp={cropMode ? endCropDrag : endDrag}
          onPointerCancel={cropMode ? endCropDrag : endDrag}
          onDoubleClick={cropMode ? undefined : resetZoom}
        />
      )}

      {cropMode && (
        <div
          className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-panel/95 px-2 py-1.5 shadow-lg backdrop-blur"
          style={{ top: `${Math.round(cropToolbarTop)}px` }}
        >
          <div className="flex items-center gap-0.5">
            {CROP_ASPECTS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => applyAspect(a.value)}
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] transition-colors",
                  cropAspect === a.value
                    ? "bg-accent/20 text-fg"
                    : "text-muted hover:bg-raised hover:text-fg",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-line" />
          <button
            type="button"
            aria-label="Cancel crop"
            title="Cancel"
            onClick={cancelCrop}
            className="grid size-6 place-items-center rounded-full text-muted transition-colors hover:bg-danger/20 hover:text-danger"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            aria-label="Apply crop"
            title="Apply"
            onClick={commitCrop}
            className="grid size-6 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent/90"
          >
            <Check size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
