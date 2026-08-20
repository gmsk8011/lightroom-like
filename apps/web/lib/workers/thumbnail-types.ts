/**
 * Shared shape for the thumbnail worker's messages. The worker itself lives
 * as a plain script at public/thumbnail-worker.js, not a bundled TS module —
 * see that file's header comment for why — so these types exist purely for
 * the main-thread side (service.ts) to type against; nothing here is
 * imported by the worker.
 */
export interface ThumbnailRequest {
  id: string;
  file: File;
  targetWidth: number;
}

export type ThumbnailResponse =
  | {
      id: string;
      ok: true;
      blob: Blob;
      thumbWidth: number;
      thumbHeight: number;
    }
  | { id: string; ok: false; error: string };
