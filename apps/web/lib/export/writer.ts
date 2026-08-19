import { downloadBlob } from "@/lib/collage/download";

export const OUTPUT_DIRECTORY_NAME = "framer-export";

export interface OutputWriter {
  readonly kind: "directory" | "download";
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
 * Fallback for when there's no folder to write back into — either the
 * browser lacks the File System Access API, or the photos came in as loose
 * files rather than a folder, which leaves nothing to write back to.
 *
 * Each photo is handed to the browser as its own download the moment it
 * finishes, so exports arrive as ordinary image files rather than an
 * archive to unpack. Nothing accumulates in memory either — the previous
 * implementation built a ZIP, which meant holding every exported photo at
 * once purely to bundle them back up.
 */
class DownloadWriter implements OutputWriter {
  readonly kind = "download" as const;
  readonly destination = "your downloads";

  async write(filename: string, blob: Blob): Promise<void> {
    downloadBlob(blob, filename);
    // Browsers rate-limit and can silently drop downloads fired back-to-back
    // in the same tick. Writes are already serialized by the export runner,
    // so a short pause here is all it takes to keep every file.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  async finish(): Promise<void> {
    // Nothing to do — every file was handed off as it finished.
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
  return new DownloadWriter();
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
