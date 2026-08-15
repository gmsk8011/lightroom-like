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
  cn,
} from "@lrl/ui";
import { FONT_LABELS } from "@lrl/engine";
import { useRecipeStore } from "@/stores/recipe-store";

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const FONT_OPTIONS = FONT_LABELS.map(([value, label]) => ({ value, label }));

/** Nine quick-pick spots, laid out to match their visual position. */
const POSITION_PRESETS: { x: number; y: number }[] = [
  { x: 10, y: 10 },
  { x: 50, y: 10 },
  { x: 90, y: 10 },
  { x: 10, y: 50 },
  { x: 50, y: 50 },
  { x: 90, y: 50 },
  { x: 10, y: 90 },
  { x: 50, y: 90 },
  { x: 90, y: 90 },
];

function PositionGrid({
  x,
  y,
  disabled,
  onPick,
}: {
  x: number;
  y: number;
  disabled: boolean;
  onPick: (x: number, y: number) => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-1 rounded border border-line bg-raised p-1.5",
        disabled && "opacity-50",
      )}
    >
      {POSITION_PRESETS.map((p) => {
        const active = Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1;
        return (
          <button
            key={`${p.x}-${p.y}`}
            type="button"
            disabled={disabled}
            aria-label={`Move caption to x ${p.x}%, y ${p.y}%`}
            onClick={() => onPick(p.x, p.y)}
            className="grid aspect-square place-items-center rounded transition-colors hover:bg-raised-hover"
          >
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors",
                active ? "bg-accent" : "bg-faint",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function CaptionPanel() {
  const caption = useRecipeStore((s) => s.recipe.caption);
  const setCaption = useRecipeStore((s) => s.setCaption);
  const resetCaption = useRecipeStore((s) => s.resetCaption);

  const off = !caption.enabled;

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

      <p className="-mt-1 mb-1.5 text-[10px] leading-relaxed text-faint">
        Drag the caption anywhere on the photo, or use a quick spot below. It
        always overlays the photo — it never resizes it.
      </p>

      <PositionGrid
        x={caption.positionX}
        y={caption.positionY}
        disabled={off}
        onPick={(x, y) => {
          setCaption("positionX", x);
          setCaption("positionY", y);
        }}
      />

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
