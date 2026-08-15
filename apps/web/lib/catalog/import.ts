import {
  DECODABLE_EXTENSIONS,
  extensionOf,
  isPhotoFile,
  photoId,
  type ImportResult,
  type Photo,
} from "./types";

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function toPhoto(
  name: string,
  relPath: string,
  size: number,
  lastModified: number,
  handle: FileSystemFileHandle | null,
  file: File | null,
): Photo {
  const extension = extensionOf(name);
  const decodable = DECODABLE_EXTENSIONS.has(extension);
  return {
    id: photoId(relPath, size, lastModified),
    name,
    relPath,
    size,
    lastModified,
    extension,
    handle,
    file,
    width: null,
    height: null,
    aspect: null,
    thumbUrl: null,
    status: decodable ? "queued" : "unsupported",
    error: decodable
      ? null
      : `${extension.toUpperCase()} preview isn't supported yet`,
  };
}

/**
 * Walks a directory tree without ever reading file contents — only metadata.
 * A 5,000-photo folder costs a few hundred handle reads, not gigabytes.
 */
export async function walkDirectory(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  out: Photo[],
  skipped: { count: number },
  depth: number,
): Promise<void> {
  if (depth > 8) return;

  for await (const entry of dir.values()) {
    if (entry.kind === "directory") {
      await walkDirectory(
        entry as FileSystemDirectoryHandle,
        `${prefix}${entry.name}/`,
        out,
        skipped,
        depth + 1,
      );
      continue;
    }

    const handle = entry as FileSystemFileHandle;
    if (!isPhotoFile(handle.name)) {
      skipped.count += 1;
      continue;
    }

    // getFile() here is metadata-only; the bytes stay on disk until read.
    const meta = await handle.getFile();
    out.push(
      toPhoto(
        handle.name,
        `${prefix}${handle.name}`,
        meta.size,
        meta.lastModified,
        handle,
        null,
      ),
    );
  }
}

export async function importFromDirectory(): Promise<ImportResult | null> {
  if (!window.showDirectoryPicker) return null;

  let dir: FileSystemDirectoryHandle;
  try {
    dir = await window.showDirectoryPicker({
      id: "framer-photos",
      mode: "readwrite",
      startIn: "pictures",
    });
  } catch (err) {
    // The user dismissing the picker is a normal outcome, not an error.
    if (err instanceof DOMException && err.name === "AbortError") return null;
    throw err;
  }

  const photos: Photo[] = [];
  const skipped = { count: 0 };
  await walkDirectory(dir, "", photos, skipped, 0);
  photos.sort((a, b) => a.relPath.localeCompare(b.relPath));

  return {
    photos,
    directoryHandle: dir,
    directoryName: dir.name,
    skipped: skipped.count,
  };
}

export function importFromFileList(files: FileList | File[]): ImportResult {
  const photos: Photo[] = [];
  let skipped = 0;

  for (const file of Array.from(files)) {
    if (!isPhotoFile(file.name)) {
      skipped += 1;
      continue;
    }
    const relPath = file.webkitRelativePath || file.name;
    photos.push(
      toPhoto(file.name, relPath, file.size, file.lastModified, null, file),
    );
  }

  photos.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { photos, directoryHandle: null, directoryName: null, skipped };
}

/** Resolves a photo's bytes on demand, whichever way it was imported. */
export async function readPhotoFile(photo: Photo): Promise<File> {
  if (photo.file) return photo.file;
  if (photo.handle) return photo.handle.getFile();
  throw new Error(`No file source for ${photo.name}`);
}
