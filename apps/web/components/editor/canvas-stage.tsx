"use client";

import { AlertTriangle, ImagePlus, ShieldCheck } from "lucide-react";
import { useActivePhoto } from "@/stores/catalog-store";
import { useUiStore } from "@/stores/ui-store";
import { ImportControl } from "./import-control";
import { PreviewCanvas } from "./preview-canvas";

function EmptyState() {
  return (
    <div className="flex max-w-sm flex-col items-center text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full border border-line bg-panel">
        <ImagePlus size={22} className="text-faint" />
      </div>

      <h2 className="mb-1.5 text-sm font-medium text-fg">No photos yet</h2>
      <p className="mb-5 text-xs leading-relaxed text-faint">
        Choose a folder or drop photos here. They are read straight from your
        disk and never uploaded anywhere.
      </p>

      <ImportControl variant="primary" size="md" label="Choose folder" />

      <div className="mt-6 flex items-center gap-1.5 text-[11px] text-faint">
        <ShieldCheck size={12} />
        Everything runs locally in your browser
      </div>
    </div>
  );
}

export function CanvasStage() {
  const photo = useActivePhoto();
  const showOriginal = useUiStore((s) => s.showOriginal);

  return (
    <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-canvas p-4 sm:p-8">
      {!photo && <EmptyState />}

      {photo && photo.status === "unsupported" && (
        <div className="flex flex-col items-center text-center">
          <AlertTriangle size={20} className="mb-3 text-faint" />
          <p className="text-sm text-fg">{photo.name}</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-faint">
            {photo.error}. RAW and TIFF decoding arrives with the export engine.
          </p>
        </div>
      )}

      {photo && photo.status !== "unsupported" && (
        <PreviewCanvas key={photo.id} photo={photo} />
      )}

      {photo && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded bg-black/60 px-2 py-1 text-[11px] text-muted backdrop-blur">
          <span>{photo.name}</span>
          {photo.width ? (
            <span>
              {photo.width}×{photo.height}
            </span>
          ) : null}
          {showOriginal && (
            <span className="font-medium text-accent">Original</span>
          )}
        </div>
      )}
    </main>
  );
}
