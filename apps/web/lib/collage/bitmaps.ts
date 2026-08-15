import { readPhotoFile } from "@/lib/catalog/import";
import type { Photo } from "@/lib/catalog/types";

// Bounded like thumbnails/service.ts's THUMB_WIDTH, but higher-res since a
// collage cell can fill a much larger part of the screen than a filmstrip
// thumbnail — full source resolution is reserved for export only.
const PREVIEW_MAX_EDGE = 1400;

/** Decoded bitmaps for the collage preview, keyed by photo id. Kept small
 *  and evicted eagerly — this is a live-preview cache, not a persistent one. */
class CollageBitmapCache {
  private cache = new Map<string, ImageBitmap>();

  async get(photo: Photo): Promise<ImageBitmap> {
    const existing = this.cache.get(photo.id);
    if (existing) return existing;

    const file = await readPhotoFile(photo);
    const bitmap = await createImageBitmap(file, {
      resizeWidth: PREVIEW_MAX_EDGE,
      resizeQuality: "high",
    });
    this.cache.set(photo.id, bitmap);
    return bitmap;
  }

  /** Called when a cell no longer references a photo. */
  evict(photoId: string): void {
    this.cache.get(photoId)?.close();
    this.cache.delete(photoId);
  }

  /** Evicts everything except the given ids — called after each redraw so
   *  the cache tracks exactly what the collage currently uses, not every
   *  photo ever assigned to a cell during the session. */
  pruneExcept(ids: ReadonlySet<string>): void {
    for (const id of this.cache.keys()) {
      if (!ids.has(id)) this.evict(id);
    }
  }

  clear(): void {
    for (const bitmap of this.cache.values()) bitmap.close();
    this.cache.clear();
  }
}

export const collageBitmaps = new CollageBitmapCache();
