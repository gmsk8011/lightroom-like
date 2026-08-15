/** Same blob→object-URL→`<a download>`→click→revoke pattern already used
 *  by the fallback zip writer in lib/export/writer.ts — a collage export is
 *  a new derived file, not a write-back into the imported folder, so a
 *  plain browser download is the right fit regardless of which import path
 *  brought the source photos in. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
