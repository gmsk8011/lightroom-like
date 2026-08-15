"use client";

import * as React from "react";
import {
  captionBox,
  composite,
  computeFrameLayout,
  DEFAULT_BORDER,
  DEFAULT_FILTERS,
  FilterRenderer,
  measureCaption,
  type CaptionMetrics,
  type EditRecipe,
  type FrameLayout,
} from "@lrl/engine";
import { readPhotoFile } from "@/lib/catalog/import";
import type { Photo } from "@/lib/catalog/types";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import { useUiStore } from "@/stores/ui-store";

/** Beyond this the extra pixels are invisible on screen but cost real GPU
 *  time on every slider tick. */
const MAX_PREVIEW_EDGE = 2560;

/** Extra hit-test tolerance around the caption box, in canvas-internal
 *  pixels, so a small caption is still easy to grab. */
const DRAG_HIT_PADDING = 10;

interface PreviewCanvasProps {
  photo: Photo;
}

interface DrawInfo {
  layout: FrameLayout;
  metrics: CaptionMetrics | null;
  scale: number;
}

export function PreviewCanvas({ photo }: PreviewCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const glCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<FilterRenderer | null>(null);
  const bitmapRef = React.useRef<ImageBitmap | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const lastDrawRef = React.useRef<DrawInfo | null>(null);
  const draggingRef = React.useRef(false);

  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [hovering, setHovering] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  const showOriginal = useUiStore((s) => s.showOriginal);
  const updatePhoto = useCatalogStore((s) => s.updatePhoto);

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
      // the same numbers the export will use.
      const full = computeFrameLayout(recipe.border, bitmap.width, bitmap.height);

      const fit = Math.min(
        box.width / full.canvas.width,
        box.height / full.canvas.height,
        1,
      );
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = full.canvas.width * fit;
      const displayHeight = full.canvas.height * fit;
      const quality = Math.min(
        dpr,
        MAX_PREVIEW_EDGE / Math.max(displayWidth, displayHeight),
      );
      const scale = fit * Math.max(quality, 0.1);

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

      canvas.style.width = `${Math.round(displayWidth)}px`;
      canvas.style.height = `${Math.round(displayHeight)}px`;

      // Reused for hit-testing drag gestures against the caption's box —
      // computed with the same inputs composite() used internally, so it
      // matches exactly what's on screen.
      const metrics = measureCaption(ctx, recipe.caption, bitmap.width, bitmap.height);
      lastDrawRef.current = { layout, metrics, scale };
    },
    [box],
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
    if (!ready) return;

    const current = useRecipeStore.getState().recipe;
    // Comparing to the original means no filters and no frame — the photo
    // exactly as it came off the disk.
    const shown: EditRecipe = showOriginal
      ? { ...current, filters: DEFAULT_FILTERS, border: DEFAULT_BORDER }
      : current;
    schedule(shown);

    if (showOriginal) return;
    return useRecipeStore.subscribe((state) => schedule(state.recipe));
  }, [ready, showOriginal, schedule]);

  React.useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

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
    (point: { x: number; y: number }): boolean => {
      const info = lastDrawRef.current;
      const caption = useRecipeStore.getState().recipe.caption;
      if (!info?.metrics || !caption.enabled) return false;
      const target = captionBox(
        info.layout.canvas.width,
        info.layout.canvas.height,
        caption,
        info.metrics,
        info.scale,
      );
      return (
        point.x >= target.x - DRAG_HIT_PADDING &&
        point.x <= target.x + target.width + DRAG_HIT_PADDING &&
        point.y >= target.y - DRAG_HIT_PADDING &&
        point.y <= target.y + target.height + DRAG_HIT_PADDING
      );
    },
    [],
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = canvasPoint(event);
      if (!point || !hitTestCaption(point)) return;
      event.preventDefault();
      draggingRef.current = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canvasPoint, hitTestCaption],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = canvasPoint(event);
      if (!point) return;

      if (draggingRef.current) {
        const info = lastDrawRef.current;
        if (!info) return;
        const x = Math.min(100, Math.max(0, (point.x / info.layout.canvas.width) * 100));
        const y = Math.min(100, Math.max(0, (point.y / info.layout.canvas.height) * 100));
        const store = useRecipeStore.getState();
        store.setCaption("positionX", x);
        store.setCaption("positionY", y);
      } else {
        setHovering(hitTestCaption(point));
      }
    },
    [canvasPoint, hitTestCaption],
  );

  const endDrag = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  /* -------------------------------------------------------------- view */

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      {error ? (
        <p className="max-w-xs text-center text-xs leading-relaxed text-faint">
          {error}
        </p>
      ) : (
        <canvas
          ref={canvasRef}
          className="shadow-2xl shadow-black/50"
          style={{
            opacity: ready ? 1 : 0,
            transition: "opacity 120ms",
            touchAction: "none",
            cursor: dragging ? "grabbing" : hovering ? "grab" : "default",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => setHovering(false)}
        />
      )}
    </div>
  );
}
