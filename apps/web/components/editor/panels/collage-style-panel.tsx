"use client";

import { ColorField, Panel, Slider } from "@lrl/ui";
import {
  DEFAULT_COLLAGE_BORDER_WIDTH_PCT,
  DEFAULT_COLLAGE_RADIUS_PCT,
  DEFAULT_GAP_PCT,
} from "@lrl/engine";
import { useCollageStore } from "@/stores/collage-store";

export function CollageStylePanel() {
  const collage = useCollageStore((s) => s.collage);
  const setGap = useCollageStore((s) => s.setGap);
  const setGapColor = useCollageStore((s) => s.setGapColor);
  const setBorderWidth = useCollageStore((s) => s.setBorderWidth);
  const setBorderColor = useCollageStore((s) => s.setBorderColor);
  const setRadius = useCollageStore((s) => s.setRadius);

  return (
    <Panel title="Style">
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
    </Panel>
  );
}
