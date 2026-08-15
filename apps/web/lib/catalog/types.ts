export type PhotoStatus = "queued" | "ready" | "unsupported" | "error";

export interface Photo {
  /** Stable across re-imports of the same file, so thumbnail cache hits. */
  id: string;
  name: string;
  relPath: string;
  size: number;
  lastModified: number;
  extension: string;
  /** Present when imported via the directory picker (Chromium). */
  handle: FileSystemFileHandle | null;
  /** Present when imported via the <input> fallback. */
  file: File | null;
  /** True pixel dimensions — only known once the photo is fully decoded. */
  width: number | null;
  height: number | null;
  /** width/height ratio, known as soon as the thumbnail exists. */
  aspect: number | null;
  thumbUrl: string | null;
  status: PhotoStatus;
  error: string | null;
}

export interface ImportResult {
  photos: Photo[];
  /** Set when the directory picker was used — needed to write exports back. */
  directoryHandle: FileSystemDirectoryHandle | null;
  directoryName: string | null;
  skipped: number;
}

/** Formats every browser can decode natively for preview. */
export const DECODABLE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
]);

/**
 * Formats we recognise as photos but cannot preview yet. They are imported
 * and shown greyed out rather than silently dropped, so it's obvious why a
 * file from the chosen folder is missing.
 */
export const KNOWN_UNSUPPORTED_EXTENSIONS = new Set([
  "tif",
  "tiff",
  "heic",
  "heif",
  "dng",
  "cr2",
  "cr3",
  "nef",
  "arw",
  "raf",
  "orf",
  "rw2",
]);

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function isPhotoFile(name: string): boolean {
  const ext = extensionOf(name);
  return DECODABLE_EXTENSIONS.has(ext) || KNOWN_UNSUPPORTED_EXTENSIONS.has(ext);
}

export function photoId(
  relPath: string,
  size: number,
  lastModified: number,
): string {
  return `${relPath}:${size}:${lastModified}`;
}
