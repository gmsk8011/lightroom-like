// A plain, unbundled classic worker — deliberately NOT compiled/chunked by
// Turbopack. Its production `next build` worker bundling (new Worker(new
// URL("...ts", import.meta.url), {type:"module"})) was found to be
// unreliable in practice: this worker's own compiled chunks contained none
// of its message-handling logic, and a hand-written, unbundled worker with
// identical logic worked correctly where the bundled one threw
// "Cannot read properties of undefined (reading 'filters')" — a message
// that doesn't correspond to anything in this file, pointing at the chunk
// loader rather than this code. Serving this file as-is from public/
// sidesteps that bundling path entirely: the browser fetches and runs
// exactly these bytes, nothing else to go wrong in between.
//
// Keep this in sync with apps/web/lib/workers/thumbnail-types.ts by hand —
// there's no bundler here to share that import through.

self.onmessage = async (event) => {
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

    self.postMessage({ id, ok: true, blob, thumbWidth, thumbHeight });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
