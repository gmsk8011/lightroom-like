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
import { DEFAULT_CAPTION, FONT_LABELS, type CaptionStyle } from "@lrl/engine";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const FONT_OPTIONS = FONT_LABELS.map(([value, label]) => ({ value, label }));

const STYLE_OPTIONS: readonly { value: CaptionStyle; label: string }[] = [
  { value: "fill", label: "Fill" },
  { value: "outline", label: "Outline" },
  { value: "knockout", label: "Knockout" },
];

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
  const photoId = useCatalogStore((s) => s.activeId);
  const caption = useRecipeStore((s) =>
    photoId ? (s.recipes[photoId]?.caption ?? DEFAULT_CAPTION) : DEFAULT_CAPTION,
  );
  const setCaption = useRecipeStore((s) => s.setCaption);
  const resetCaption = useRecipeStore((s) => s.resetCaption);

  const noPhoto = !photoId;
  const off = noPhoto || !caption.enabled;

  function set<K extends keyof typeof caption>(key: K, value: (typeof caption)[K]) {
    if (photoId) setCaption(photoId, key, value);
  }

  return (
    <Panel
      title="Caption"
      defaultOpen={false}
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => photoId && resetCaption(photoId)}
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
        onChange={(v) => set("enabled", v)}
      />

      <TextField
        value={caption.text}
        multiline
        rows={3}
        maxLength={500}
        placeholder="Type a caption…"
        onChange={(v) => set("text", v)}
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
          set("positionX", x);
          set("positionY", y);
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
        onChange={(v) => set("positionX", v)}
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
        onChange={(v) => set("positionY", v)}
      />

      <Segmented
        label="Alignment"
        value={caption.align}
        options={ALIGN_OPTIONS}
        onChange={(v) => set("align", v)}
        columns={3}
      />

      <Segmented
        label="Typeface"
        value={caption.fontFamily}
        options={FONT_OPTIONS}
        onChange={(v) => set("fontFamily", v)}
        columns={4}
      />

      <Segmented
        label="Style"
        value={caption.style}
        options={STYLE_OPTIONS}
        onChange={(v) => set("style", v)}
        columns={3}
      />

      {caption.style !== "knockout" && (
        <ColorField
          label="Text colour"
          value={caption.color}
          disabled={off}
          onChange={(v) => set("color", v)}
        />
      )}

      <Slider
        label={caption.style === "knockout" ? "Cutout strength" : "Opacity"}
        value={caption.opacity}
        min={0}
        max={1}
        step={0.01}
        precision={2}
        defaultValue={1}
        disabled={off}
        onChange={(v) => set("opacity", v)}
      />
      {caption.style === "knockout" && (
        <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
          Lower this to make the letters see-through instead of fully
          transparent — the box colour blends in rather than the raw photo.
        </p>
      )}

      {caption.style === "outline" && (
        <>
          <ColorField
            label="Outline colour"
            value={caption.borderColor}
            disabled={off}
            onChange={(v) => set("borderColor", v)}
          />
          <Slider
            label="Outline width"
            value={caption.borderWidthPct}
            min={0}
            max={20}
            step={0.5}
            precision={1}
            defaultValue={8}
            disabled={off}
            onChange={(v) => set("borderWidthPct", v)}
          />
        </>
      )}

      {caption.style === "knockout" && (
        <>
          <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
            The text is cut out of this box, so the photo shows through the
            letters.
          </p>
          <ColorField
            label="Box colour"
            value={caption.backgroundColor}
            disabled={off}
            onChange={(v) => set("backgroundColor", v)}
          />
          <Slider
            label="Box opacity"
            value={caption.backgroundOpacity}
            min={0}
            max={1}
            step={0.01}
            precision={2}
            defaultValue={0.5}
            disabled={off}
            onChange={(v) => set("backgroundOpacity", v)}
          />
          <Slider
            label="Box width"
            value={caption.boxWidthPct}
            min={0}
            max={100}
            step={0.5}
            precision={1}
            defaultValue={0}
            disabled={off}
            onChange={(v) => set("boxWidthPct", v)}
          />
          <Slider
            label="Box height"
            value={caption.boxHeightPct}
            min={0}
            max={100}
            step={0.5}
            precision={1}
            defaultValue={0}
            disabled={off}
            onChange={(v) => set("boxHeightPct", v)}
          />
          <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
            0 fits the box tightly to the text. Above that, it's a minimum —
            the box only ever grows to fit, never shrinks the text.
          </p>
        </>
      )}

      {caption.style !== "knockout" && (
        <Toggle
          label="Background box"
          checked={caption.backgroundEnabled}
          onChange={(v) => set("backgroundEnabled", v)}
        />
      )}

      {caption.style !== "knockout" && caption.backgroundEnabled && (
        <>
          <ColorField
            label="Box colour"
            value={caption.backgroundColor}
            disabled={off}
            onChange={(v) => set("backgroundColor", v)}
          />
          <Slider
            label="Box opacity"
            value={caption.backgroundOpacity}
            min={0}
            max={1}
            step={0.01}
            precision={2}
            defaultValue={0.5}
            disabled={off}
            onChange={(v) => set("backgroundOpacity", v)}
          />
          <Slider
            label="Box width"
            value={caption.boxWidthPct}
            min={0}
            max={100}
            step={0.5}
            precision={1}
            defaultValue={0}
            disabled={off}
            onChange={(v) => set("boxWidthPct", v)}
          />
          <Slider
            label="Box height"
            value={caption.boxHeightPct}
            min={0}
            max={100}
            step={0.5}
            precision={1}
            defaultValue={0}
            disabled={off}
            onChange={(v) => set("boxHeightPct", v)}
          />
        </>
      )}

      <Toggle
        label="Shadow"
        checked={caption.shadowEnabled}
        onChange={(v) => set("shadowEnabled", v)}
      />

      {caption.shadowEnabled && (
        <Slider
          label="Shadow opacity"
          value={caption.shadowOpacity}
          min={0}
          max={1}
          step={0.01}
          precision={2}
          defaultValue={0.5}
          disabled={off}
          onChange={(v) => set("shadowOpacity", v)}
        />
      )}

      <Slider
        label="Size"
        value={caption.sizePct}
        min={0.5}
        max={15}
        step={0.1}
        precision={1}
        defaultValue={2.4}
        disabled={off}
        onChange={(v) => set("sizePct", v)}
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
        onChange={(v) => set("fontWeight", v)}
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
        onChange={(v) => set("letterSpacing", v)}
      />

      <Toggle
        label="Uppercase"
        checked={caption.uppercase}
        onChange={(v) => set("uppercase", v)}
      />
    </Panel>
  );
}
