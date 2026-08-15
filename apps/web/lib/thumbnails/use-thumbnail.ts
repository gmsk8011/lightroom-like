"use client";

import * as React from "react";
import { useCatalogStore } from "@/stores/catalog-store";
import { thumbnails } from "./service";

/**
 * Requests a thumbnail when the item mounts. Because the filmstrip and grid
 * are virtualized, only photos actually scrolled into view ever get decoded —
 * importing 5,000 files does no decode work until you look at them.
 */
export function useThumbnail(photoId: string): void {
  const status = useCatalogStore((s) => s.byId[photoId]?.status);
  const hasThumb = useCatalogStore((s) => Boolean(s.byId[photoId]?.thumbUrl));

  React.useEffect(() => {
    if (status !== "queued" || hasThumb) return;

    let cancelled = false;
    const photo = useCatalogStore.getState().byId[photoId];
    if (!photo) return;

    void thumbnails
      .request(photo)
      .then((result) => {
        if (cancelled) return;
        useCatalogStore.getState().updatePhoto(photoId, {
          thumbUrl: result.url,
          aspect: result.thumbWidth / result.thumbHeight,
          status: "ready",
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        useCatalogStore.getState().updatePhoto(photoId, {
          status: "error",
          error: err instanceof Error ? err.message : "Could not read file",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [photoId, status, hasThumb]);
}
