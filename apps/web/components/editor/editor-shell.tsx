"use client";

import * as React from "react";
import { ImageDown } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { useCatalogStore } from "@/stores/catalog-store";
import { importFromDataTransfer } from "@/lib/catalog/drop";
import { thumbnails } from "@/lib/thumbnails/service";
import { TopBar } from "./top-bar";
import { LeftRail } from "./left-rail";
import { RightRail } from "./right-rail";
import { CanvasStage } from "./canvas-stage";
import { Filmstrip } from "./filmstrip";
import { ExportDialog } from "./export-dialog";
import { CollageLeftRail } from "./collage/collage-left-rail";
import { CollageRightRail } from "./collage/collage-right-rail";
import { CollageCanvasStage } from "./collage/collage-canvas-stage";

export function EditorShell() {
  const mobileSheet = useUiStore((s) => s.mobileSheet);
  const setMobileSheet = useUiStore((s) => s.setMobileSheet);
  const filmstripOpen = useUiStore((s) => s.filmstripOpen);
  const mode = useUiStore((s) => s.mode);
  const addImport = useCatalogStore((s) => s.addImport);

  const [dragging, setDragging] = React.useState(false);
  // Drag events fire for every child element, so a plain boolean flickers.
  const dragDepth = React.useRef(0);

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);

      void importFromDataTransfer(event.dataTransfer).then((result) => {
        if (result.photos.length === 0) return;
        thumbnails.reset();
        addImport(result);
      });
    },
    [addImport],
  );

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-base"
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <TopBar />

      <div className="relative flex min-h-0 flex-1">
        {mode === "edit" ? (
          <>
            <LeftRail />
            <CanvasStage />
            <RightRail />
          </>
        ) : (
          <>
            <CollageLeftRail />
            <CollageCanvasStage />
            <CollageRightRail />
          </>
        )}

        {mobileSheet !== "none" && (
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setMobileSheet("none")}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}
      </div>

      {filmstripOpen && <Filmstrip />}

      <ExportDialog />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-accent/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-accent/70 bg-panel/90 px-10 py-8">
            <ImageDown size={26} className="text-accent" />
            <p className="text-sm font-medium text-fg">Drop photos or a folder</p>
          </div>
        </div>
      )}
    </div>
  );
}
