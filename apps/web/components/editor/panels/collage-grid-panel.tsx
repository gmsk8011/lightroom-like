"use client";

import { Panel, Segmented } from "@lrl/ui";
import type { AspectRatio } from "@lrl/engine";
import { useCollageStore } from "@/stores/collage-store";

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

export function CollageGridPanel() {
  const collage = useCollageStore((s) => s.collage);
  const setGrid = useCollageStore((s) => s.setGrid);
  const setAspect = useCollageStore((s) => s.setAspect);

  const gridValue = `${collage.rows}x${collage.cols}`;

  return (
    <Panel title="Grid">
      <Segmented
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
    </Panel>
  );
}
