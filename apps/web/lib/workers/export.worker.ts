/// <reference lib="webworker" />

import { ExportRenderer, type EditRecipe, type ExportOptions } from "@lrl/engine";

export interface ExportRequest {
  id: string;
  file: File;
  recipe: EditRecipe;
  options: ExportOptions;
}

export type ExportResponse =
  | { id: string; ok: true; blob: Blob; width: number; height: number }
  | { id: string; ok: false; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// One renderer per worker: the WebGL context and its compiled programs are
// reused across every photo this worker handles.
const renderer = new ExportRenderer();

ctx.onmessage = async (event: MessageEvent<ExportRequest>) => {
  const { id, file, recipe, options } = event.data;
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
    const blob = await renderer.render(bitmap, recipe, options);
    const response: ExportResponse = {
      id,
      ok: true,
      blob,
      width: bitmap.width,
      height: bitmap.height,
    };
    ctx.postMessage(response);
  } catch (err) {
    const response: ExportResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(response);
  } finally {
    // Released immediately so peak memory tracks the pool size, not the
    // number of photos queued.
    bitmap?.close();
  }
};
