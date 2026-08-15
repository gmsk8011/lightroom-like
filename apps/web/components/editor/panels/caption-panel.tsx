"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { FONT_LABELS, type Caption, type CaptionStyle } from "@lrl/engine";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import { useUiStore } from "@/stores/ui-store";

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const FONT_OPTIONS = FONT_LABELS.map(([value, label]) => ({ value, label }));

const STYLE_OPTIONS: readonly { value: CaptionStyle; label: string }[] = [
  { value: "fill", label: "Fill" },
  { value: "outline", label: "Outline" },
  { value: "hollow", label: "Hollow" },
  { value: "knockout", label: "Knockout" },
  { value: "frosted", label: "Frosted" },
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
  onPick,
}: {
  x: number;
  y: number;
  onPick: (x: number, y: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded border border-line bg-raised p-1.5">
      {POSITION_PRESETS.map((p) => {
        const active = Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1;
        return (
          <button
            key={`${p.x}-${p.y}`}
            type="button"
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

function CaptionList({
  captions,
  selectedId,
  onSelect,
  onDelete,
}: {
  captions: Caption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (captions.length === 0) {
    return (
      <p className="mb-1.5 text-[11px] leading-relaxed text-faint">
        No captions yet. Add one to place text anywhere on the photo.
      </p>
    );
  }

  return (
    <div className="mb-2 flex flex-col gap-0.5">
      {captions.map((c, i) => (
        <div
          key={c.id}
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-1 transition-colors",
            c.id === selectedId ? "bg-accent/15" : "hover:bg-raised",
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              "min-w-0 flex-1 truncate text-left text-xs",
              c.id === selectedId ? "text-fg" : "text-muted",
            )}
          >
            {c.text.trim() || `Caption ${i + 1}`}
          </button>
          <button
            type="button"
            onClick={() => onDelete(c.id)}
            aria-label={`Delete ${c.text.trim() || `caption ${i + 1}`}`}
            title="Delete caption"
            className="shrink-0 rounded p-1 text-faint transition-colors hover:bg-danger/20 hover:text-danger"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

// A stable reference for the "no captions yet" case — a fresh `[]` literal
// inside the selector would give useSyncExternalStore a new snapshot on
// every render and spin into an infinite update loop.
const EMPTY_CAPTIONS: Caption[] = [];

export function CaptionPanel() {
  const photoId = useCatalogStore((s) => s.activeId);
  const captions = useRecipeStore((s) =>
    photoId ? (s.recipes[photoId]?.captions ?? EMPTY_CAPTIONS) : EMPTY_CAPTIONS,
  );
  const addCaption = useRecipeStore((s) => s.addCaption);
  const removeCaption = useRecipeStore((s) => s.removeCaption);
  const setCaptionField = useRecipeStore((s) => s.setCaption);

  const selectedCaptionId = useUiStore((s) => s.selectedCaptionId);
  const setSelectedCaptionId = useUiStore((s) => s.setSelectedCaptionId);

  const caption = captions.find((c) => c.id === selectedCaptionId) ?? captions[0] ?? null;

  function set<K extends keyof Caption>(key: K, value: Caption[K]) {
    if (photoId && caption) setCaptionField(photoId, caption.id, key, value);
  }

  function handleAdd() {
    if (!photoId) return;
    const id = addCaption(photoId);
    setSelectedCaptionId(id);
  }

  function handleDelete(id: string) {
    if (!photoId) return;
    removeCaption(photoId, id);
    if (selectedCaptionId === id) setSelectedCaptionId(null);
  }

  return (
    <Panel
      title="Captions"
      defaultOpen={false}
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAdd}
          disabled={!photoId}
          aria-label="Add caption"
          title="Add caption"
        >
          <Plus size={13} />
        </Button>
      }
    >
      <CaptionList
        captions={captions}
        selectedId={caption?.id ?? null}
        onSelect={setSelectedCaptionId}
        onDelete={handleDelete}
      />

      {caption && (
        <>
          <TextField
            value={caption.text}
            multiline
            rows={3}
            maxLength={500}
            placeholder="Type a caption…"
            onChange={(v) => set("text", v)}
          />

          <p className="-mt-1 mb-1.5 text-[10px] leading-relaxed text-faint">
            Drag this caption anywhere on the photo, or use a quick spot
            below. It always overlays the photo — it never resizes it.
          </p>

          <PositionGrid
            x={caption.positionX}
            y={caption.positionY}
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

          {(caption.style === "fill" || caption.style === "outline") && (
            <ColorField
              label="Text colour"
              value={caption.color}
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
            onChange={(v) => set("opacity", v)}
          />
          {caption.style === "knockout" && (
            <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
              Lower this to make the letters see-through instead of fully
              transparent — the box colour blends in rather than the raw
              photo.
            </p>
          )}
          {caption.style === "frosted" && (
            <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
              A soft, barely-there engraved look — try a lower opacity for a
              subtler blend into the photo.
            </p>
          )}
          {caption.style === "hollow" && (
            <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
              No fill — only the outline is drawn, so the photo shows through
              the inside of each letter.
            </p>
          )}

          {(caption.style === "outline" || caption.style === "hollow") && (
            <>
              <ColorField
                label="Outline colour"
                value={caption.borderColor}
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
                onChange={(v) => set("borderWidthPct", v)}
              />
            </>
          )}

          {caption.style === "knockout" && (
            <>
              <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
                The text is cut out of this box, so the photo shows through
                the letters.
              </p>
              <ColorField
                label="Box colour"
                value={caption.backgroundColor}
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
                onChange={(v) => set("backgroundOpacity", v)}
              />
            </>
          )}

          {caption.style !== "knockout" && caption.style !== "frosted" && (
            <Toggle
              label="Background box"
              checked={caption.backgroundEnabled}
              onChange={(v) => set("backgroundEnabled", v)}
            />
          )}

          {caption.style !== "knockout" &&
            caption.style !== "frosted" &&
            caption.backgroundEnabled && (
              <>
                <ColorField
                  label="Box colour"
                  value={caption.backgroundColor}
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
                  onChange={(v) => set("backgroundOpacity", v)}
                />
              </>
            )}

          {caption.style !== "frosted" && (
            <>
              <Slider
                label="Box width"
                value={caption.boxWidthPct}
                min={0}
                max={100}
                step={0.5}
                precision={1}
                defaultValue={0}
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
                onChange={(v) => set("boxHeightPct", v)}
              />
              <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
                0 fits the box tightly to the text. Above that, it grows the
                box; below the text's natural size, it crops the text to fit.
              </p>
            </>
          )}

          <Toggle
            label="Backdrop blur"
            checked={caption.backdropBlurEnabled}
            onChange={(v) => set("backdropBlurEnabled", v)}
          />
          {caption.backdropBlurEnabled && (
            <>
              <Slider
                label="Backdrop blur amount"
                value={caption.backdropBlurAmount}
                min={0}
                max={100}
                step={1}
                precision={0}
                defaultValue={40}
                onChange={(v) => set("backdropBlurAmount", v)}
              />
              <p className="-mt-1 mb-1 text-[10px] leading-relaxed text-faint">
                Blurs the photo behind the caption box, so text stays
                readable over busy backgrounds without a solid panel.
              </p>
            </>
          )}

          {caption.style !== "knockout" && caption.style !== "frosted" && (
            <Toggle
              label="Glow"
              checked={caption.glowEnabled}
              onChange={(v) => set("glowEnabled", v)}
            />
          )}
          {caption.style !== "knockout" &&
            caption.style !== "frosted" &&
            caption.glowEnabled && (
              <Slider
                label="Glow amount"
                value={caption.glowAmount}
                min={0}
                max={100}
                step={1}
                precision={0}
                defaultValue={40}
                onChange={(v) => set("glowAmount", v)}
              />
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
            onChange={(v) => set("letterSpacing", v)}
          />

          <Toggle
            label="Uppercase"
            checked={caption.uppercase}
            onChange={(v) => set("uppercase", v)}
          />
        </>
      )}
    </Panel>
  );
}
