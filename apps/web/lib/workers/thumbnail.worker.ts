/// <reference lib="webworker" />

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

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<ThumbnailRequest>) => {
  const { id, file, targetWidth } = event.data;

  try {
    // resizeWidth lets the decoder scale during decode rather than after,
    // which keeps peak memory sane on 50-megapixel files. Height is omitted
    // so the aspect ratio is preserved.
    const bitmap = await createImageBitmap(file, {
      resizeWidth: targetWidth,
      resizeQuality: "high",
    });

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const g = canvas.getContext("2d");
    if (!g) throw new Error("2D context unavailable in worker");
    g.drawImage(bitmap, 0, 0);

    const thumbWidth = bitmap.width;
    const thumbHeight = bitmap.height;
    bitmap.close();

    // Thumbnails are display-only, so lossy WebP is fine here. Originals are
    // never touched by this path.
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.82,
    });

    const response: ThumbnailResponse = {
      id,
      ok: true,
      blob,
      thumbWidth,
      thumbHeight,
    };
    ctx.postMessage(response);
  } catch (err) {
    const response: ThumbnailResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(response);
  }
};
