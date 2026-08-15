"use client";

import { RotateCcw } from "lucide-react";
import { Button, Panel, Slider } from "@lrl/ui";
import { DEFAULT_FILTERS, type Filters } from "@lrl/engine";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";

interface Control {
  key: keyof Filters;
  label: string;
  min: number;
  max: number;
  step: number;
  precision: number;
}

const TONE: Control[] = [
  { key: "exposure", label: "Exposure", min: -5, max: 5, step: 0.01, precision: 2 },
  { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1, precision: 0 },
  { key: "highlights", label: "Highlights", min: -100, max: 100, step: 1, precision: 0 },
  { key: "shadows", label: "Shadows", min: -100, max: 100, step: 1, precision: 0 },
  { key: "whites", label: "Whites", min: -100, max: 100, step: 1, precision: 0 },
  { key: "blacks", label: "Blacks", min: -100, max: 100, step: 1, precision: 0 },
];

const COLOR: Control[] = [
  { key: "temperature", label: "Temperature", min: -100, max: 100, step: 1, precision: 0 },
  { key: "tint", label: "Tint", min: -100, max: 100, step: 1, precision: 0 },
  { key: "vibrance", label: "Vibrance", min: -100, max: 100, step: 1, precision: 0 },
  { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, precision: 0 },
];

const EFFECTS: Control[] = [
  { key: "denoise", label: "Denoise", min: 0, max: 100, step: 1, precision: 0 },
  { key: "clarity", label: "Clarity", min: -100, max: 100, step: 1, precision: 0 },
  { key: "orton", label: "Orton Glow", min: 0, max: 100, step: 1, precision: 0 },
  { key: "softGlow", label: "Soft Glow", min: 0, max: 100, step: 1, precision: 0 },
  { key: "haze", label: "Haze", min: 0, max: 100, step: 1, precision: 0 },
  { key: "mist", label: "Mist", min: 0, max: 100, step: 1, precision: 0 },
  { key: "diffusion", label: "Diffusion", min: 0, max: 100, step: 1, precision: 0 },
  { key: "vignette", label: "Vignette", min: -100, max: 100, step: 1, precision: 0 },
  { key: "grain", label: "Grain", min: 0, max: 100, step: 1, precision: 0 },
];

function ControlGroup({ controls }: { controls: Control[] }) {
  const photoId = useCatalogStore((s) => s.activeId);
  const filters = useRecipeStore((s) =>
    photoId ? (s.recipes[photoId]?.filters ?? DEFAULT_FILTERS) : DEFAULT_FILTERS,
  );
  const setFilter = useRecipeStore((s) => s.setFilter);

  return (
    <>
      {controls.map((c) => (
        <Slider
          key={c.key}
          label={c.label}
          min={c.min}
          max={c.max}
          step={c.step}
          precision={c.precision}
          defaultValue={0}
          disabled={!photoId}
          value={filters[c.key] as number}
          onChange={(v) => photoId && setFilter(photoId, c.key, v as never)}
        />
      ))}
    </>
  );
}

export function FiltersPanel() {
  const photoId = useCatalogStore((s) => s.activeId);
  const resetFilters = useRecipeStore((s) => s.resetFilters);

  return (
    <>
      <Panel
        title="Light"
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => photoId && resetFilters(photoId)}
            aria-label="Reset all filters"
            title="Reset all filters"
          >
            <RotateCcw size={13} />
          </Button>
        }
      >
        <ControlGroup controls={TONE} />
      </Panel>

      <Panel title="Color">
        <ControlGroup controls={COLOR} />
      </Panel>

      <Panel title="Effects" defaultOpen={false}>
        <ControlGroup controls={EFFECTS} />
      </Panel>
    </>
  );
}
