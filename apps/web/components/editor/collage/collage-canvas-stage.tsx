"use client";

import { ImagePlus, ShieldCheck } from "lucide-react";
import { usePhotoCount } from "@/stores/catalog-store";
import { ImportControl } from "../import-control";
import { CollageCanvas } from "./collage-canvas";

function EmptyState() {
  return (
    <div className="flex max-w-sm flex-col items-center text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full border border-line bg-panel">
        <ImagePlus size={22} className="text-faint" />
      </div>

      <h2 className="mb-1.5 text-sm font-medium text-fg">No photos yet</h2>
      <p className="mb-5 text-xs leading-relaxed text-faint">
        Choose a folder first, then come back here to build a collage from
        it.
      </p>

      <ImportControl variant="primary" size="md" label="Choose folder" />

      <div className="mt-6 flex items-center gap-1.5 text-[11px] text-faint">
        <ShieldCheck size={12} />
        Everything runs locally in your browser
      </div>
    </div>
  );
}

export function CollageCanvasStage() {
  const count = usePhotoCount();

  return (
    <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-canvas p-4 sm:p-8">
      {count === 0 ? <EmptyState /> : <CollageCanvas />}
    </main>
  );
}
