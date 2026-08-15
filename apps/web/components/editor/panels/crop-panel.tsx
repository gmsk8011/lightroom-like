"use client";

import { Crop as CropIcon, RotateCcw } from "lucide-react";
import { Button, Panel, Slider } from "@lrl/ui";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import { useUiStore } from "@/stores/ui-store";

export function CropPanel() {
  const photoId = useCatalogStore((s) => s.activeId);
  const crop = useRecipeStore((s) => (photoId ? s.recipes[photoId]?.crop : null));
  const clearCrop = useRecipeStore((s) => s.clearCrop);
  const cropMode = useUiStore((s) => s.cropMode);
  const setCropMode = useUiStore((s) => s.setCropMode);
  const cropRotation = useUiStore((s) => s.cropRotation);
  const setCropRotation = useUiStore((s) => s.setCropRotation);

  const off = !photoId;

  return (
    <Panel title="Crop" defaultOpen={false}>
      <Button
        size="sm"
        variant={cropMode ? "primary" : "default"}
        className="w-full"
        disabled={off}
        onClick={() => setCropMode(!cropMode)}
      >
        <CropIcon size={13} />
        {cropMode ? "Editing crop…" : "Open crop tool"}
      </Button>

      {cropMode && (
        <>
          <Slider
            label="Straighten"
            value={cropRotation}
            min={-45}
            max={45}
            step={0.5}
            precision={1}
            defaultValue={0}
            onChange={setCropRotation}
          />
          <Button
            size="sm"
            variant="ghost"
            className="-mt-1 mb-1"
            disabled={cropRotation === 0}
            onClick={() => setCropRotation(0)}
          >
            <RotateCcw size={12} />
            Reset straighten
          </Button>
        </>
      )}

      {crop ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
          Cropped to {crop.width.toFixed(0)}% × {crop.height.toFixed(0)}% of the
          original photo
          {crop.rotation !== 0 ? `, straightened ${crop.rotation.toFixed(1)}°` : ""}.
        </p>
      ) : (
        <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
          Not cropped — the full photo is used.
        </p>
      )}

      {crop && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 w-full"
          disabled={off}
          onClick={() => photoId && clearCrop(photoId)}
        >
          Remove crop
        </Button>
      )}
    </Panel>
  );
}
