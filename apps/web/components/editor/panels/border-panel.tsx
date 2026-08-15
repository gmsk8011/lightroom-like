"use client";

import { RotateCcw } from "lucide-react";
import { Button, ColorField, Panel, Segmented, Slider } from "@lrl/ui";
import { DEFAULT_BORDER, type AspectRatio, type FrameType } from "@lrl/engine";
import { useCatalogStore } from "@/stores/catalog-store";
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
  { value: "1.91:1", label: "1.91:1" },
];

/** Instagram's own names for its four post shapes, mapped to the ratio that
 *  produces them — friendlier to pick from than raw ratios. */
const INSTAGRAM_OPTIONS: readonly { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "Square" },
  { value: "4:5", label: "Portrait" },
  { value: "1.91:1", label: "Landscape" },
  { value: "9:16", label: "Story/Reel" },
];

export function BorderPanel() {
  const photoId = useCatalogStore((s) => s.activeId);
  const border = useRecipeStore((s) =>
    photoId ? (s.recipes[photoId]?.border ?? DEFAULT_BORDER) : DEFAULT_BORDER,
  );
  const setBorder = useRecipeStore((s) => s.setBorder);
  const resetBorder = useRecipeStore((s) => s.resetBorder);

  const off = !photoId;
  // Width only matters for frames that draw a border; colour still matters
  // whenever anything is visible behind the photo, including aspect padding.
  const noWidth = off || border.type === "none" || border.type === "aspect-pad";
  const noFill = off || (border.type === "none" && border.aspect === "original");

  function set<K extends keyof typeof border>(key: K, value: (typeof border)[K]) {
    if (photoId) setBorder(photoId, key, value);
  }

  return (
    <Panel
      title="Border"
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => photoId && resetBorder(photoId)}
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
        onChange={(v) => set("type", v)}
        columns={3}
      />

      <Segmented
        label="Instagram sizes"
        value={border.aspect}
        options={INSTAGRAM_OPTIONS}
        onChange={(v) => set("aspect", v)}
        columns={4}
      />

      <Segmented
        label="Aspect ratio"
        value={border.aspect}
        options={ASPECT_OPTIONS}
        onChange={(v) => set("aspect", v)}
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
        onChange={(v) => set("widthPct", v)}
      />

      <ColorField
        label="Colour"
        value={border.color}
        disabled={noFill}
        onChange={(v) => set("color", v)}
      />

      <Slider
        label="Corner radius"
        value={border.radiusPct}
        min={0}
        max={20}
        step={0.1}
        precision={1}
        defaultValue={0}
        disabled={off}
        onChange={(v) => set("radiusPct", v)}
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
            disabled={off}
            onChange={(v) => set("lineWidthPct", v)}
          />
          <ColorField
            label="Line colour"
            value={border.lineColor}
            disabled={off}
            onChange={(v) => set("lineColor", v)}
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
        disabled={off}
        onChange={(v) => set("shadowSizePct", v)}
      />
    </Panel>
  );
}
