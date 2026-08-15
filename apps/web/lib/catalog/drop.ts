import { importFromFileList, walkDirectory } from "./import";
import type { ImportResult, Photo } from "./types";

interface FileSystemHandleCapableItem extends DataTransferItem {
  getAsFileSystemHandle?: () => Promise<
    FileSystemFileHandle | FileSystemDirectoryHandle | null
  >;
}

/**
 * Chromium can hand back real filesystem handles from a drop, which makes a
 * dropped folder behave exactly like a picked one — including writing exports
 * back to it. Everywhere else we fall back to the plain file list, which still
 * imports fine but cannot write back.
 */
export async function importFromDataTransfer(
  transfer: DataTransfer,
): Promise<ImportResult> {
  const items = Array.from(transfer.items) as FileSystemHandleCapableItem[];
  const canUseHandles = items.some(
    (item) => typeof item.getAsFileSystemHandle === "function",
  );

  if (!canUseHandles) {
    return importFromFileList(transfer.files);
  }

  const handles = await Promise.all(
    items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFileSystemHandle?.() ?? Promise.resolve(null)),
  );

  const photos: Photo[] = [];
  const skipped = { count: 0 };
  let directoryHandle: FileSystemDirectoryHandle | null = null;
  let directoryName: string | null = null;
  const looseFiles: File[] = [];

  for (const handle of handles) {
    if (!handle) continue;

    if (handle.kind === "directory") {
      const dir = handle as FileSystemDirectoryHandle;
      // Only a single dropped folder can own the export destination.
      if (!directoryHandle) {
        directoryHandle = dir;
        directoryName = dir.name;
      }
      await walkDirectory(dir, "", photos, skipped, 0);
    } else {
      const file = await (handle as FileSystemFileHandle).getFile();
      looseFiles.push(file);
    }
  }

  if (looseFiles.length > 0) {
    const loose = importFromFileList(looseFiles);
    photos.push(...loose.photos);
    skipped.count += loose.skipped;
  }

  // getAsFileSystemHandle resolves to null for drag sources that aren't backed
  // by real files. When that leaves us empty-handed but the plain file list has
  // content, use it rather than dropping the import on the floor.
  if (photos.length === 0 && transfer.files.length > 0) {
    return importFromFileList(transfer.files);
  }

  photos.sort((a, b) => a.relPath.localeCompare(b.relPath));

  return {
    photos,
    directoryHandle,
    directoryName,
    skipped: skipped.count,
  };
}
