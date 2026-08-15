import { formatFilename, type EditRecipe, type ExportOptions } from "@lrl/engine";
import { readPhotoFile } from "@/lib/catalog/import";
import type { Photo } from "@/lib/catalog/types";
import type {
  ExportRequest,
  ExportResponse,
} from "@/lib/workers/export.worker";
import { createWriter, type OutputWriter } from "./writer";

export interface ExportFailure {
  name: string;
  message: string;
}

export interface ExportProgress {
  total: number;
  completed: number;
  failures: ExportFailure[];
  currentName: string | null;
  destination: string | null;
  state: "running" | "done" | "cancelled" | "failed";
  message?: string;
}

interface Job {
  photo: Photo;
  index: number;
}

/**
 * Runs a bulk export.
 *
 * Concurrency is bounded by the worker pool, and each finished blob is written
 * out and dropped before the next job starts on that worker — so exporting
 * 500 photos has the same peak memory as exporting 4.
 */
export class ExportRun {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Job[] = [];
  private inFlight = new Map<Worker, Job>();
  private writer: OutputWriter | null = null;
  private cancelled = false;
  private settle: (() => void) | null = null;

  private completed = 0;
  private readonly failures: ExportFailure[] = [];
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly photos: Photo[],
    private readonly getRecipe: (photo: Photo) => EditRecipe,
    private readonly options: ExportOptions,
    private readonly directoryHandle: FileSystemDirectoryHandle | null,
    private readonly onProgress: (progress: ExportProgress) => void,
  ) {}

  private get poolSize(): number {
    const cores = navigator.hardwareConcurrency || 4;
    return Math.max(1, Math.min(4, cores - 1, this.photos.length));
  }

  private report(
    state: ExportProgress["state"],
    currentName: string | null,
    message?: string,
  ): void {
    this.onProgress({
      total: this.photos.length,
      completed: this.completed,
      failures: [...this.failures],
      currentName,
      destination: this.writer?.destination ?? null,
      state,
      message,
    });
  }

  async start(): Promise<void> {
    try {
      this.writer = await createWriter(this.directoryHandle);
    } catch (err) {
      this.report(
        "failed",
        null,
        err instanceof Error ? err.message : "Couldn't prepare the output folder",
      );
      return;
    }

    this.queue = this.photos.map((photo, index) => ({ photo, index }));
    this.report("running", null);

    for (let i = 0; i < this.poolSize; i += 1) {
      const worker = new Worker(
        new URL("@/lib/workers/export.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (e: MessageEvent<ExportResponse>) =>
        this.onResult(worker, e.data);
      worker.onerror = () =>
        this.onResult(worker, {
          id: "",
          ok: false,
          error: "Export worker crashed",
        });
      this.workers.push(worker);
      this.idle.push(worker);
    }

    const finished = new Promise<void>((resolve) => {
      this.settle = resolve;
    });

    this.pump();
    await finished;

    // Flush the archive (a no-op for the directory writer, which already
    // wrote every file as it went).
    if (!this.cancelled) {
      try {
        await this.writeChain;
        await this.writer.finish();
      } catch (err) {
        this.report(
          "failed",
          null,
          err instanceof Error ? err.message : "Couldn't finish writing",
        );
        this.teardown();
        return;
      }
    }

    this.teardown();
    this.report(this.cancelled ? "cancelled" : "done", null);
  }

  private pump(): void {
    if (this.cancelled) return;

    while (this.queue.length > 0 && this.idle.length > 0) {
      const job = this.queue.shift();
      const worker = this.idle.pop();
      if (!job || !worker) break;

      this.inFlight.set(worker, job);
      this.report("running", job.photo.name);

      void readPhotoFile(job.photo)
        .then((file) => {
          if (this.cancelled) return;
          const request: ExportRequest = {
            id: job.photo.id,
            file,
            recipe: this.getRecipe(job.photo),
            options: this.options,
          };
          worker.postMessage(request);
        })
        .catch((err: unknown) => {
          this.onResult(worker, {
            id: job.photo.id,
            ok: false,
            error: err instanceof Error ? err.message : "Could not read file",
          });
        });
    }

    if (this.queue.length === 0 && this.inFlight.size === 0) {
      this.settle?.();
      this.settle = null;
    }
  }

  private onResult(worker: Worker, result: ExportResponse): void {
    const job = this.inFlight.get(worker);
    this.inFlight.delete(worker);
    this.idle.push(worker);

    if (!job) {
      this.pump();
      return;
    }

    if (!result.ok) {
      // One bad file must not take the run down with it.
      this.failures.push({ name: job.photo.name, message: result.error });
      this.completed += 1;
      this.report("running", job.photo.name);
      this.pump();
      return;
    }

    const filename = formatFilename(
      this.options.filenameTemplate,
      job.photo.name,
      job.index + 1,
      this.options,
    );

    // Writes are serialized so two workers never race on the same directory
    // handle; rendering continues in parallel behind them.
    this.writeChain = this.writeChain
      .then(() => this.writer?.write(filename, result.blob))
      .then(() => {
        this.completed += 1;
        this.report("running", job.photo.name);
      })
      .catch((err: unknown) => {
        this.failures.push({
          name: job.photo.name,
          message: err instanceof Error ? err.message : "Could not write file",
        });
        this.completed += 1;
        this.report("running", job.photo.name);
      });

    this.pump();
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.queue = [];
    this.settle?.();
    this.settle = null;
  }

  private teardown(): void {
    for (const worker of this.workers) worker.terminate();
    this.workers = [];
    this.idle = [];
    this.inFlight.clear();
  }
}
