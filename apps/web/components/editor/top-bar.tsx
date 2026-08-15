"use client";

import * as React from "react";
import {
  Download,
  Eye,
  FolderX,
  PanelLeft,
  PanelRight,
  Rows3,
  SlidersHorizontal,
} from "lucide-react";
import { Button, cn, Segmented } from "@lrl/ui";
import { DEFAULT_EXPORT_OPTIONS, type ExportFormat } from "@lrl/engine";
import { useUiStore, type EditorMode } from "@/stores/ui-store";
import { useCatalogStore, usePhotoCount } from "@/stores/catalog-store";
import { useExportStore } from "@/stores/export-store";
import { useCollageHasAnyPhoto } from "@/stores/collage-store";
import { exportCollage } from "@/lib/collage/export";
import { ApplyToAllButton } from "./apply-to-all-button";
import { ImportControl } from "./import-control";

const MODE_OPTIONS: readonly { value: EditorMode; label: string }[] = [
  { value: "edit", label: "Edit" },
  { value: "collage", label: "Collage" },
];

export function TopBar() {
  const {
    leftOpen,
    rightOpen,
    filmstripOpen,
    mode,
    setMode,
    toggleLeft,
    toggleRight,
    toggleFilmstrip,
    setMobileSheet,
    showOriginal,
    setShowOriginal,
  } = useUiStore();

  const count = usePhotoCount();
  const directoryName = useCatalogStore((s) => s.directoryName);
  const selectedCount = useCatalogStore((s) => s.selected.size);
  const collageHasPhoto = useCollageHasAnyPhoto();
  const [collageExporting, setCollageExporting] = React.useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 sm:px-3">
      <div className="flex items-center gap-2 pr-1">
        <div className="grid size-6 place-items-center rounded-sm border border-line bg-raised">
          <div className="size-2.5 rounded-[1px] border border-fg/70" />
        </div>
        <span className="hidden text-sm font-semibold tracking-tight sm:block">
          Framer
        </span>
      </div>

      <div className="h-5 w-px bg-line" />

      {/* Library sheet toggle — small screens only */}
      <Button
        size="sm"
        variant="ghost"
        className="lg:hidden"
        onClick={() => setMobileSheet("library")}
        aria-label="Open library"
      >
        <PanelLeft size={15} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="hidden lg:inline-flex"
        onClick={toggleLeft}
        aria-label={leftOpen ? "Hide library panel" : "Show library panel"}
        aria-pressed={leftOpen}
      >
        <PanelLeft size={15} className={cn(leftOpen && "text-accent")} />
      </Button>

      <ImportControl hideLabelOnSmall />

      <div className="flex-1" />

      {count > 0 && (
        <span className="hidden truncate px-1 text-xs text-faint md:block">
          {directoryName ? `${directoryName} · ` : ""}
          {count} photo{count === 1 ? "" : "s"}
          {selectedCount > 1 ? ` · ${selectedCount} selected` : ""}
        </span>
      )}

      {count > 0 && (
        <Segmented
          value={mode}
          options={MODE_OPTIONS}
          onChange={setMode}
          columns={2}
        />
      )}

      {count > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => useCatalogStore.getState().clear()}
          aria-label="Close folder"
          title="Close folder — removes every photo from the library, doesn't touch the files on disk"
        >
          <FolderX size={15} />
        </Button>
      )}

      {count > 0 && mode === "edit" && <ApplyToAllButton />}

      {mode === "edit" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowOriginal(!showOriginal)}
          aria-label="Compare with original"
          aria-pressed={showOriginal}
          title="Compare with original (\)"
          disabled={count === 0}
        >
          <Eye size={15} className={cn(showOriginal && "text-accent")} />
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={toggleFilmstrip}
        aria-label={filmstripOpen ? "Hide filmstrip" : "Show filmstrip"}
        aria-pressed={filmstripOpen}
      >
        <Rows3 size={15} className={cn(filmstripOpen && "text-accent")} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="hidden lg:inline-flex"
        onClick={toggleRight}
        aria-label={rightOpen ? "Hide adjustments panel" : "Show adjustments panel"}
        aria-pressed={rightOpen}
      >
        <PanelRight size={15} className={cn(rightOpen && "text-accent")} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="lg:hidden"
        onClick={() => setMobileSheet("adjust")}
        aria-label="Open adjustments"
      >
        <SlidersHorizontal size={15} />
      </Button>

      <Button
        size="sm"
        variant="primary"
        className="gap-1.5"
        disabled={mode === "collage" ? !collageHasPhoto || collageExporting : count === 0}
        onClick={() => {
          if (mode === "collage") {
            setCollageExporting(true);
            void exportCollage({
              ...DEFAULT_EXPORT_OPTIONS,
              format: "jpeg" as ExportFormat,
              quality: 0.95,
            }).finally(() => setCollageExporting(false));
            return;
          }
          useExportStore.getState().setOpen(true);
        }}
      >
        <Download size={14} />
        <span className="hidden sm:inline">
          {mode === "collage" && collageExporting ? "Exporting…" : "Export"}
        </span>
      </Button>
    </header>
  );
}
