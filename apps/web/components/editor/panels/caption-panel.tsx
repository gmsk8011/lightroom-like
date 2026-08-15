"use client";

import { RotateCcw } from "lucide-react";
import {
  Button,
  ColorField,
  Panel,
  Segmented,
  Slider,
  TextField,
  Toggle,
} from "@lrl/ui";
import { FONT_LABELS, type CaptionAnchor } from "@lrl/engine";
import { useRecipeStore } from "@/stores/recipe-store";

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const ANCHOR_OPTIONS: readonly { value: CaptionAnchor; label: string }[] = [
  { value: "border-bottom", label: "Below" },
  { value: "border-top", label: "Above" },
  { value: "image-bottom", label: "On btm" },
  { value: "image-top", label: "On top" },
  { value: "free", label: "Anywhere" },
];

const FONT_OPTIONS = FONT_LABELS.map(([value, label]) => ({ value, label }));

export function CaptionPanel() {
  const caption = useRecipeStore((s) => s.recipe.caption);
  const setCaption = useRecipeStore((s) => s.setCaption);
  const resetCaption = useRecipeStore((s) => s.resetCaption);

  const off = !caption.enabled;
  const free = caption.anchor === "free";

  return (
    <Panel
      title="Caption"
      defaultOpen={false}
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={resetCaption}
          aria-label="Reset caption"
          title="Reset caption"
        >
          <RotateCcw size={13} />
        </Button>
      }
    >
      <Toggle
        label="Show caption"
        checked={caption.enabled}
        onChange={(v) => setCaption("enabled", v)}
      />

      <TextField
        value={caption.text}
        multiline
        rows={3}
        maxLength={500}
        placeholder="Type a caption…"
        onChange={(v) => setCaption("text", v)}
      />

      <Segmented
        label="Position"
        value={caption.anchor}
        options={ANCHOR_OPTIONS}
        onChange={(v) => setCaption("anchor", v)}
        columns={3}
      />

      {free && (
        <>
          <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
            Drag the caption on the photo, or set its position here.
          </p>
          <Slider
            label="X position"
            value={caption.positionX}
            min={0}
            max={100}
            step={0.5}
            precision={1}
            defaultValue={50}
            disabled={off}
            onChange={(v) => setCaption("positionX", v)}
          />
          <Slider
            label="Y position"
            value={caption.positionY}
            min={0}
            max={100}
            step={0.5}
            precision={1}
            defaultValue={88}
            disabled={off}
            onChange={(v) => setCaption("positionY", v)}
          />
        </>
      )}

      <Segmented
        label="Alignment"
        value={caption.align}
        options={ALIGN_OPTIONS}
        onChange={(v) => setCaption("align", v)}
        columns={3}
      />

      <Segmented
        label="Typeface"
        value={caption.fontFamily}
        options={FONT_OPTIONS}
        onChange={(v) => setCaption("fontFamily", v)}
        columns={4}
      />

      <ColorField
        label="Text colour"
        value={caption.color}
        disabled={off}
        onChange={(v) => setCaption("color", v)}
      />

      <Slider
        label="Size"
        value={caption.sizePct}
        min={0.5}
        max={15}
        step={0.1}
        precision={1}
        defaultValue={2.4}
        disabled={off}
        onChange={(v) => setCaption("sizePct", v)}
      />

      <Slider
        label="Weight"
        value={caption.fontWeight}
        min={100}
        max={900}
        step={100}
        precision={0}
        defaultValue={400}
        disabled={off}
        onChange={(v) => setCaption("fontWeight", v)}
      />

      {!free && (
        <Slider
          label="Offset"
          value={caption.offsetPct}
          min={-20}
          max={20}
          step={0.1}
          precision={1}
          defaultValue={0}
          disabled={off}
          onChange={(v) => setCaption("offsetPct", v)}
        />
      )}

      <Slider
        label="Letter spacing"
        value={caption.letterSpacing}
        min={-0.1}
        max={1}
        step={0.01}
        precision={2}
        defaultValue={0}
        disabled={off}
        onChange={(v) => setCaption("letterSpacing", v)}
      />

      <Toggle
        label="Uppercase"
        checked={caption.uppercase}
        onChange={(v) => setCaption("uppercase", v)}
      />
    </Panel>
  );
}
