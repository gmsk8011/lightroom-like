import { zip } from "fflate";

export const OUTPUT_DIRECTORY_NAME = "framer-export";

export interface OutputWriter {
  readonly kind: "directory" | "zip";
  /** Where results end up, for display in the UI. */
  readonly destination: string;
  write(filename: string, blob: Blob): Promise<void>;
  finish(): Promise<void>;
}

/**
 * Writes straight into a subfolder of the imported directory. Exports never
 * overwrite the originals — a new folder is created alongside them — and each
 * blob is handed to disk immediately, so memory stays flat over a long run.
 */
class DirectoryWriter implements OutputWriter {
  readonly kind = "directory" as const;

  constructor(
    private readonly handle: FileSystemDirectoryHandle,
    readonly destination: string,
  ) {}

  async write(filename: string, blob: Blob): Promise<void> {
    const file = await this.handle.getFileHandle(filename, { create: true });
    const stream = await file.createWritable();
    await stream.write(blob);
    await stream.close();
  }

  async finish(): Promise<void> {
    // Nothing to do — every file was already flushed to disk.
  }
}

/**
 * Fallback for browsers without the File System Access API. Everything is
 * held in memory until the archive is built, so this is only appropriate for
 * modest batches — the UI warns before using it on a large selection.
 */
class ZipWriter implements OutputWriter {
  readonly kind = "zip" as const;
  readonly destination = `${OUTPUT_DIRECTORY_NAME}.zip`;
  private readonly files: Record<string, Uint8Array> = {};

  async write(filename: string, blob: Blob): Promise<void> {
    this.files[filename] = new Uint8Array(await blob.arrayBuffer());
  }

  async finish(): Promise<void> {
    const archive = await new Promise<Uint8Array>((resolve, reject) => {
      zip(this.files, { level: 0 }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // Level 0: the images are already compressed, so deflating them again
    // costs time and saves nothing.
    const url = URL.createObjectURL(
      new Blob([archive as BlobPart], { type: "application/zip" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = this.destination;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

export async function createWriter(
  directoryHandle: FileSystemDirectoryHandle | null,
): Promise<OutputWriter> {
  if (directoryHandle) {
    const granted = await ensureWritePermission(directoryHandle);
    if (granted) {
      const output = await directoryHandle.getDirectoryHandle(
        OUTPUT_DIRECTORY_NAME,
        { create: true },
      );
      return new DirectoryWriter(
        output,
        `${directoryHandle.name}/${OUTPUT_DIRECTORY_NAME}`,
      );
    }
  }
  return new ZipWriter();
}

async function ensureWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const current = await handle.queryPermission?.({ mode: "readwrite" });
    if (current === "granted") return true;
    const requested = await handle.requestPermission?.({ mode: "readwrite" });
    return requested === "granted";
  } catch {
    return false;
  }
}
