import { readPhotoFile } from "@/lib/catalog/import";
import type { Photo } from "@/lib/catalog/types";
import { readThumbnail, writeThumbnail } from "./cache";
import type {
  ThumbnailRequest,
  ThumbnailResponse,
} from "@/lib/workers/thumbnail-types";

export const THUMB_WIDTH = 420;

export interface ThumbnailResult {
  url: string;
  thumbWidth: number;
  thumbHeight: number;
}

interface Job {
  photo: Photo;
  resolve: (result: ThumbnailResult) => void;
  reject: (error: Error) => void;
}

/**
 * A small pool of decode workers with a queue in front. Concurrency is kept
 * deliberately low: each in-flight job holds a decoded bitmap, so the pool
 * size — not the number of photos — is what bounds peak memory. Importing
 * 5,000 photos costs the same memory as importing 3.
 */
class ThumbnailService {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Job[] = [];
  private inFlight = new Map<Worker, Job>();
  private urls = new Set<string>();
  private started = false;

  private get poolSize(): number {
    const cores = navigator.hardwareConcurrency || 4;
    return Math.max(1, Math.min(3, cores - 1));
  }

  private start(): void {
    if (this.started) return;
    this.started = true;

    for (let i = 0; i < this.poolSize; i += 1) {
      // A plain classic worker served straight from public/, not a bundled
      // TS module — see thumbnail-worker.js's own header comment for why.
      const worker = new Worker("/thumbnail-worker.js");
      worker.onmessage = (e: MessageEvent<ThumbnailResponse>) =>
        this.onWorkerMessage(worker, e.data);
      worker.onerror = () => this.onWorkerFailure(worker, "Worker crashed");
      this.workers.push(worker);
      this.idle.push(worker);
    }
  }

  private onWorkerMessage(worker: Worker, data: ThumbnailResponse): void {
    const job = this.inFlight.get(worker);
    this.inFlight.delete(worker);
    this.idle.push(worker);

    if (job) {
      if (data.ok) {
        const cached = {
          blob: data.blob,
          thumbWidth: data.thumbWidth,
          thumbHeight: data.thumbHeight,
          createdAt: Date.now(),
        };
        void writeThumbnail(job.photo.id, cached);
        job.resolve(this.toResult(cached));
      } else {
        job.reject(new Error(data.error));
      }
    }

    this.pump();
  }

  private onWorkerFailure(worker: Worker, message: string): void {
    const job = this.inFlight.get(worker);
    this.inFlight.delete(worker);
    this.idle.push(worker);
    job?.reject(new Error(message));
    this.pump();
  }

  private toResult(cached: {
    blob: Blob;
    thumbWidth: number;
    thumbHeight: number;
  }): ThumbnailResult {
    const url = URL.createObjectURL(cached.blob);
    this.urls.add(url);
    return {
      url,
      thumbWidth: cached.thumbWidth,
      thumbHeight: cached.thumbHeight,
    };
  }

  private pump(): void {
    while (this.queue.length > 0 && this.idle.length > 0) {
      const job = this.queue.shift();
      const worker = this.idle.pop();
      if (!job || !worker) break;

      this.inFlight.set(worker, job);

      void readPhotoFile(job.photo)
        .then((file) => {
          const request: ThumbnailRequest = {
            id: job.photo.id,
            file,
            targetWidth: THUMB_WIDTH,
          };
          worker.postMessage(request);
        })
        .catch((err: unknown) => {
          this.onWorkerFailure(
            worker,
            err instanceof Error ? err.message : String(err),
          );
        });
    }
  }

  async request(photo: Photo): Promise<ThumbnailResult> {
    const cached = await readThumbnail(photo.id);
    if (cached) return this.toResult(cached);

    this.start();
    return new Promise<ThumbnailResult>((resolve, reject) => {
      this.queue.push({ photo, resolve, reject });
      this.pump();
    });
  }

  /** Drops queued work and frees every object URL this service handed out. */
  reset(): void {
    for (const job of this.queue) {
      job.reject(new Error("Import cleared"));
    }
    this.queue = [];
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}

export const thumbnails = new ThumbnailService();
