"use client";

import {
  BUILTIN_PRESETS,
  DEFAULT_FILTERS,
  type FilterPreset,
  type PresetGroup,
} from "@lrl/engine";
import { cn } from "@lrl/ui";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";

const GROUP_LABELS: Record<PresetGroup, string> = {
  basic: "Basic",
  fujifilm: "Fujifilm",
};

const GROUPS: PresetGroup[] = ["basic", "fujifilm"];

function groupPresets(): Map<PresetGroup, FilterPreset[]> {
  const map = new Map<PresetGroup, FilterPreset[]>();
  for (const preset of BUILTIN_PRESETS) {
    const group = preset.group ?? "basic";
    const list = map.get(group) ?? [];
    list.push(preset);
    map.set(group, list);
  }
  return map;
}

const GROUPED = groupPresets();

export function PresetsList() {
  const photoId = useCatalogStore((s) => s.activeId);
  const activePreset = useRecipeStore((s) =>
    photoId ? (s.recipes[photoId]?.filters.preset ?? null) : DEFAULT_FILTERS.preset,
  );
  const applyFilterPreset = useRecipeStore((s) => s.applyFilterPreset);
  const resetFilters = useRecipeStore((s) => s.resetFilters);

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        disabled={!photoId}
        onClick={() => photoId && resetFilters(photoId)}
        className={cn(
          "rounded px-2 py-1.5 text-left text-xs transition-colors",
          activePreset === null
            ? "bg-accent/15 text-fg"
            : "text-muted hover:bg-raised hover:text-fg",
        )}
      >
        None
      </button>

      {GROUPS.map((group) => {
        const presets = GROUPED.get(group);
        if (!presets || presets.length === 0) return null;

        return (
          <div key={group}>
            <div className="mb-1 px-2 text-[10px] font-semibold tracking-wider text-faint uppercase">
              {GROUP_LABELS[group]}
            </div>
            <div className="flex flex-col gap-0.5">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!photoId}
                  onClick={() => photoId && applyFilterPreset(photoId, preset)}
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-xs transition-colors",
                    activePreset === preset.id
                      ? "bg-accent/15 text-fg"
                      : "text-muted hover:bg-raised hover:text-fg",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
