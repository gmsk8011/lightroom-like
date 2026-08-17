"use client";

import { Repeat, Trash2 } from "lucide-react";
import { Button, ColorField, Panel, Segmented, Slider } from "@lrl/ui";
import {
  DEFAULT_COLLAGE_BORDER_WIDTH_PCT,
  DEFAULT_COLLAGE_RADIUS_PCT,
  DEFAULT_GAP_PCT,
  type AspectRatio,
} from "@lrl/engine";
import { useCatalogStore } from "@/stores/catalog-store";
import { useCollageStore } from "@/stores/collage-store";
import { useUiStore } from "@/stores/ui-store";

interface GridPreset {
  value: string;
  label: string;
  rows: number;
  cols: number;
}

// Grid presets aren't a natural string union, so — same pattern border-panel
// uses for its own labeled option tables — they live here as a UI-local
// lookup keyed by a synthetic id, not in the engine schema.
const GRID_PRESETS: readonly GridPreset[] = [
  { value: "1x2", label: "1×2", rows: 1, cols: 2 },
  { value: "2x1", label: "2×1", rows: 2, cols: 1 },
  { value: "1x3", label: "1×3", rows: 1, cols: 3 },
  { value: "3x1", label: "3×1", rows: 3, cols: 1 },
  { value: "2x2", label: "2×2", rows: 2, cols: 2 },
  { value: "3x3", label: "3×3", rows: 3, cols: 3 },
  { value: "1x4", label: "1×4", rows: 1, cols: 4 },
  { value: "1x5", label: "1×5", rows: 1, cols: 5 },
  { value: "1x6", label: "1×6", rows: 1, cols: 6 },
  { value: "1x7", label: "1×7", rows: 1, cols: 7 },
  { value: "1x8", label: "1×8", rows: 1, cols: 8 },
];

// Same ratios and "Story/Reel" label already used by the border panel's own
// Instagram-sizes picker — the tall "screenshot" format is this 9:16 entry.
const CANVAS_SHAPE_OPTIONS: readonly { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "Square" },
  { value: "4:5", label: "Portrait" },
  { value: "1.91:1", label: "Landscape" },
  { value: "9:16", label: "Story/Reel" },
];

export function CollagePanel() {
  const photoCount = useCatalogStore((s) => s.order.length);
  const collageOpen = useUiStore((s) => s.collageOpen);
  const setCollageOpen = useUiStore((s) => s.setCollageOpen);

  const collage = useCollageStore((s) => s.collage);
  const selectedCells = useCollageStore((s) => s.selectedCells);
  const setGrid = useCollageStore((s) => s.setGrid);
  const setAspect = useCollageStore((s) => s.setAspect);
  const setGap = useCollageStore((s) => s.setGap);
  const setGapColor = useCollageStore((s) => s.setGapColor);
  const setBorderWidth = useCollageStore((s) => s.setBorderWidth);
  const setBorderColor = useCollageStore((s) => s.setBorderColor);
  const setRadius = useCollageStore((s) => s.setRadius);
  const swapSelected = useCollageStore((s) => s.swapSelected);
  const clearCell = useCollageStore((s) => s.clearCell);
  const clearAll = useCollageStore((s) => s.clearAll);

  const gridValue = `${collage.rows}x${collage.cols}`;

  return (
    <Panel
      title="Collage"
      open={collageOpen}
      onOpenChange={setCollageOpen}
      className="border-t border-line"
    >
      {photoCount === 0 ? (
        <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
          Import some photos first, then build a grid from them here.
        </p>
      ) : (
        <>
          <p className="-mt-1 mb-2 text-[10px] leading-relaxed text-faint">
            Click a cell, then click a filmstrip photo to fill it — or drag a
            photo straight onto a cell. Drag a filled cell onto another to
            move it there; drop it back on itself to swap. Scroll over a
            cell to zoom, drag inside it to reposition.
          </p>

          <Segmented
            label="Grid"
            value={gridValue}
            options={GRID_PRESETS}
            onChange={(v) => {
              const preset = GRID_PRESETS.find((p) => p.value === v);
              if (preset) setGrid(preset.rows, preset.cols);
            }}
            columns={4}
          />

          <Segmented
            label="Canvas shape"
            value={collage.aspect}
            options={CANVAS_SHAPE_OPTIONS}
            onChange={setAspect}
            columns={4}
          />

          <div className="mt-1 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              disabled={selectedCells.length !== 2}
              onClick={swapSelected}
            >
              <Repeat size={13} className="mr-1.5" />
              Swap
            </Button>
            <Button
              size="sm"
              disabled={selectedCells.length !== 1}
              onClick={() => {
                const index = selectedCells[0];
                if (index !== undefined) clearCell(index);
              }}
            >
              Clear cell
            </Button>
            <Button size="sm" variant="danger" onClick={clearAll}>
              <Trash2 size={13} className="mr-1.5" />
              Clear all
            </Button>
          </div>

          <Slider
            label="Gap"
            value={collage.gapPct}
            min={0}
            max={10}
            step={0.1}
            precision={1}
            defaultValue={DEFAULT_GAP_PCT}
            onChange={setGap}
          />
          <ColorField label="Gap colour" value={collage.gapColor} onChange={setGapColor} />

          <Slider
            label="Border"
            value={collage.borderWidthPct}
            min={0}
            max={15}
            step={0.1}
            precision={1}
            defaultValue={DEFAULT_COLLAGE_BORDER_WIDTH_PCT}
            onChange={setBorderWidth}
          />
          <ColorField
            label="Border colour"
            value={collage.borderColor}
            onChange={setBorderColor}
          />

          <Slider
            label="Corner radius"
            value={collage.radiusPct}
            min={0}
            max={20}
            step={0.1}
            precision={1}
            defaultValue={DEFAULT_COLLAGE_RADIUS_PCT}
            onChange={setRadius}
          />
        </>
      )}
    </Panel>
  );
}
