"use client";

import { Crop as CropIcon } from "lucide-react";
import { Button, Panel } from "@lrl/ui";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import { useUiStore } from "@/stores/ui-store";

export function CropPanel() {
  const photoId = useCatalogStore((s) => s.activeId);
  const crop = useRecipeStore((s) => (photoId ? s.recipes[photoId]?.crop : null));
  const clearCrop = useRecipeStore((s) => s.clearCrop);
  const cropMode = useUiStore((s) => s.cropMode);
  const setCropMode = useUiStore((s) => s.setCropMode);

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
