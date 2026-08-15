"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle, FileQuestion, X } from "lucide-react";
import { cn } from "@lrl/ui";
import { useCatalogStore } from "@/stores/catalog-store";
import { useThumbnail } from "@/lib/thumbnails/use-thumbnail";

const ITEM_WIDTH = 88;
const GAP = 6;

function FilmstripItem({ id }: { id: string }) {
  useThumbnail(id);

  const photo = useCatalogStore((s) => s.byId[id]);
  const isSelected = useCatalogStore((s) => s.selected.has(id));
  const isActive = useCatalogStore((s) => s.activeId === id);
  const select = useCatalogStore((s) => s.select);
  const removePhoto = useCatalogStore((s) => s.removePhoto);

  if (!photo) return null;

  return (
    <div
      className={cn(
        "group relative h-16 w-full overflow-hidden rounded border bg-canvas transition-colors",
        isActive
          ? "border-accent"
          : isSelected
            ? "border-accent/50"
            : "border-line hover:border-faint",
      )}
    >
      <button
        type="button"
        title={photo.error ? `${photo.name} — ${photo.error}` : photo.name}
        aria-pressed={isSelected}
        onClick={(e) =>
          select(id, { toggle: e.metaKey || e.ctrlKey, range: e.shiftKey })
        }
        className="grid h-full w-full place-items-center"
      >
        {photo.thumbUrl ? (
          <img
            src={photo.thumbUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : photo.status === "error" ? (
          <AlertTriangle size={14} className="text-danger" />
        ) : photo.status === "unsupported" ? (
          <FileQuestion size={14} className="text-faint" />
        ) : (
          <div className="h-full w-full animate-pulse bg-raised" />
        )}

        {isSelected && (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
        )}
      </button>

      <button
        type="button"
        aria-label={`Remove ${photo.name} from the library`}
        title="Remove from library"
        onClick={(e) => {
          e.stopPropagation();
          removePhoto(id);
        }}
        className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-canvas/80 text-faint opacity-0 transition-opacity hover:bg-danger/80 hover:text-white group-hover:opacity-100"
      >
        <X size={10} />
      </button>
    </div>
  );
}

export function Filmstrip() {
  const order = useCatalogStore((s) => s.order);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: order.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_WIDTH + GAP,
    overscan: 6,
  });

  if (order.length === 0) {
    return (
      <footer className="flex h-24 shrink-0 items-center border-t border-line bg-panel px-3">
        <p className="text-xs text-faint">
          Imported photos will appear here as a scrollable filmstrip.
        </p>
      </footer>
    );
  }

  return (
    <footer className="h-24 shrink-0 border-t border-line bg-panel">
      <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-hidden">
        <div
          className="relative h-full py-3"
          style={{ width: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const id = order[item.index];
            if (!id) return null;
            return (
              <div
                key={id}
                className="absolute top-3"
                style={{
                  left: `${item.start}px`,
                  width: `${ITEM_WIDTH}px`,
                }}
              >
                <FilmstripItem id={id} />
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
