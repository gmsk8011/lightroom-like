"use client";

import { RotateCcw } from "lucide-react";
import { Button, ColorField, Panel, Segmented, Slider } from "@lrl/ui";
import type { AspectRatio, FrameType } from "@lrl/engine";
import { useRecipeStore } from "@/stores/recipe-store";

const FRAME_OPTIONS: readonly { value: FrameType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "mat", label: "Mat" },
  { value: "polaroid", label: "Polaroid" },
  { value: "film", label: "Film" },
  { value: "aspect-pad", label: "Pad" },
];

const ASPECT_OPTIONS: readonly { value: AspectRatio; label: string }[] = [
  { value: "original", label: "Orig" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "5:4", label: "5:4" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

export function BorderPanel() {
  const border = useRecipeStore((s) => s.recipe.border);
  const setBorder = useRecipeStore((s) => s.setBorder);
  const resetBorder = useRecipeStore((s) => s.resetBorder);

  // Width only matters for frames that draw a border; colour still matters
  // whenever anything is visible behind the photo, including aspect padding.
  const noWidth = border.type === "none" || border.type === "aspect-pad";
  const noFill = border.type === "none" && border.aspect === "original";

  return (
    <Panel
      title="Border"
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={resetBorder}
          aria-label="Reset border"
          title="Reset border"
        >
          <RotateCcw size={13} />
        </Button>
      }
    >
      <Segmented
        value={border.type}
        options={FRAME_OPTIONS}
        onChange={(v) => setBorder("type", v)}
        columns={3}
      />

      <Segmented
        label="Aspect ratio"
        value={border.aspect}
        options={ASPECT_OPTIONS}
        onChange={(v) => setBorder("aspect", v)}
        columns={4}
      />

      <Slider
        label="Width"
        value={border.widthPct}
        min={0}
        max={40}
        step={0.1}
        precision={1}
        defaultValue={5}
        disabled={noWidth}
        onChange={(v) => setBorder("widthPct", v)}
      />

      <ColorField
        label="Colour"
        value={border.color}
        disabled={noFill}
        onChange={(v) => setBorder("color", v)}
      />

      <Slider
        label="Corner radius"
        value={border.radiusPct}
        min={0}
        max={20}
        step={0.1}
        precision={1}
        defaultValue={0}
        onChange={(v) => setBorder("radiusPct", v)}
      />

      {border.type === "mat" && (
        <>
          <Slider
            label="Inner line"
            value={border.lineWidthPct}
            min={0}
            max={3}
            step={0.05}
            precision={2}
            defaultValue={0.4}
            onChange={(v) => setBorder("lineWidthPct", v)}
          />
          <ColorField
            label="Line colour"
            value={border.lineColor}
            onChange={(v) => setBorder("lineColor", v)}
          />
        </>
      )}

      <Slider
        label="Drop shadow"
        value={border.shadowSizePct}
        min={0}
        max={10}
        step={0.1}
        precision={1}
        defaultValue={0}
        onChange={(v) => setBorder("shadowSizePct", v)}
      />
    </Panel>
  );
}
