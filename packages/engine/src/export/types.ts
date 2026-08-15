export const EXPORT_FORMATS = ["png", "webp", "jpeg"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface FormatInfo {
  id: ExportFormat;
  label: string;
  mimeType: string;
  extension: string;
  /** True when the encoder reproduces every pixel exactly. */
  lossless: boolean;
  /** Whether the quality control applies. */
  hasQuality: boolean;
  note: string;
}

export const FORMAT_INFO: Record<ExportFormat, FormatInfo> = {
  png: {
    id: "png",
    label: "PNG",
    mimeType: "image/png",
    extension: "png",
    lossless: true,
    hasQuality: false,
    note: "Lossless. Largest files.",
  },
  webp: {
    id: "webp",
    label: "WebP",
    mimeType: "image/webp",
    extension: "webp",
    lossless: false,
    hasQuality: true,
    note: "Smaller than PNG at high quality, but re-encoded.",
  },
  jpeg: {
    id: "jpeg",
    label: "JPEG",
    mimeType: "image/jpeg",
    extension: "jpg",
    lossless: false,
    hasQuality: true,
    note: "Re-encoded. Use only when file size matters.",
  },
};

export interface ExportOptions {
  format: ExportFormat;
  /** 0–1, ignored by formats without a quality control. */
  quality: number;
  /** Supports {name}, {n}, {date}, {ext}. */
  filenameTemplate: string;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "png",
  quality: 1,
  filenameTemplate: "{name}-framed.{ext}",
};

export function encodeSettings(
  options: ExportOptions,
): { type: string; quality?: number } {
  const info = FORMAT_INFO[options.format];
  return info.hasQuality
    ? { type: info.mimeType, quality: options.quality }
    : { type: info.mimeType };
}

/** Fills a filename template. Index is 1-based for display. */
export function formatFilename(
  template: string,
  sourceName: string,
  index: number,
  options: ExportOptions,
): string {
  const dot = sourceName.lastIndexOf(".");
  const stem = dot === -1 ? sourceName : sourceName.slice(0, dot);
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const filled = template
    .replace(/\{name\}/g, stem)
    .replace(/\{n\}/g, String(index).padStart(3, "0"))
    .replace(/\{date\}/g, date)
    .replace(/\{ext\}/g, FORMAT_INFO[options.format].extension);

  // Strip anything that can't appear in a filename on any common platform.
  return filled.replace(/[\\/:*?"<>|]/g, "_");
}
