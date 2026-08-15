"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FolderDown,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  EXPORT_FORMATS,
  FORMAT_INFO,
  type ExportFormat,
} from "@lrl/engine";
import { Button, Segmented, Slider, TextField, cn } from "@lrl/ui";
import { useCatalogStore } from "@/stores/catalog-store";
import { useExportCount, useExportStore } from "@/stores/export-store";

const FORMAT_OPTIONS = EXPORT_FORMATS.map((id) => ({
  value: id,
  label: FORMAT_INFO[id].label,
}));

export function ExportDialog() {
  const { open, scope, options, progress, setOpen, setScope, setOption, start, cancel } =
    useExportStore();
  const count = useExportCount();
  const hasDirectory = useCatalogStore((s) => Boolean(s.directoryHandle));
  const selectedCount = useCatalogStore((s) => s.selected.size);
  const totalCount = useCatalogStore((s) => s.order.length);

  if (!open) return null;

  const info = FORMAT_INFO[options.format];
  const running = progress?.state === "running";
  const finished =
    progress?.state === "done" ||
    progress?.state === "cancelled" ||
    progress?.state === "failed";

  const percent = progress?.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close export"
        disabled={running}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-label="Export photos"
        className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-2xl shadow-black/60"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-medium">Export</h2>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Close"
            disabled={running}
            onClick={() => setOpen(false)}
          >
            <X size={14} />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!progress && (
            <>
              <Segmented
                label="Photos"
                value={scope}
                columns={2}
                options={[
                  { value: "selected", label: `Selected (${selectedCount})` },
                  { value: "all", label: `All (${totalCount})` },
                ]}
                onChange={setScope}
              />

              <Segmented
                label="Format"
                value={options.format}
                columns={3}
                options={FORMAT_OPTIONS}
                onChange={(v) => setOption("format", v as ExportFormat)}
              />

              <div
                className={cn(
                  "mt-1 flex items-start gap-1.5 rounded border px-2 py-1.5 text-[11px] leading-relaxed",
                  info.lossless
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-line bg-raised text-muted",
                )}
              >
                {info.lossless ? (
                  <ShieldCheck size={12} className="mt-px shrink-0" />
                ) : (
                  <AlertTriangle size={12} className="mt-px shrink-0" />
                )}
                <span>
                  {info.lossless ? "No compression. " : ""}
                  {info.note}
                </span>
              </div>

              {info.hasQuality && (
                <Slider
                  label="Quality"
                  value={options.quality}
                  min={0.5}
                  max={1}
                  step={0.01}
                  precision={2}
                  defaultValue={1}
                  onChange={(v) => setOption("quality", v)}
                />
              )}

              <TextField
                label="Filename"
                value={options.filenameTemplate}
                onChange={(v) => setOption("filenameTemplate", v)}
              />
              <p className="-mt-1 text-[10px] leading-relaxed text-faint">
                {"{name} original name · {n} number · {date} today · {ext} extension"}
              </p>

              <div className="mt-3 flex items-start gap-1.5 rounded border border-line bg-raised px-2 py-1.5 text-[11px] leading-relaxed text-muted">
                <FolderDown size={12} className="mt-px shrink-0" />
                <span>
                  {hasDirectory
                    ? "Saved to a new framer-export folder inside your photo folder. Originals are never modified."
                    : "Your browser can't write to a folder, so exports download as a ZIP. Large batches may use a lot of memory."}
                </span>
              </div>
            </>
          )}

          {progress && (
            <div className="py-2">
              <div className="mb-2 flex items-center gap-2">
                {running && (
                  <Loader2 size={14} className="animate-spin text-accent" />
                )}
                {progress.state === "done" && (
                  <CheckCircle2 size={14} className="text-success" />
                )}
                {(progress.state === "failed" ||
                  progress.state === "cancelled") && (
                  <AlertTriangle size={14} className="text-danger" />
                )}
                <span className="text-xs text-fg">
                  {running && `Exporting ${progress.completed} of ${progress.total}`}
                  {progress.state === "done" &&
                    `Exported ${progress.completed - progress.failures.length} of ${progress.total}`}
                  {progress.state === "cancelled" && "Export cancelled"}
                  {progress.state === "failed" && "Export failed"}
                </span>
              </div>

              <div className="h-1 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full bg-accent transition-[width] duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {running && progress.currentName && (
                <p className="mt-2 truncate text-[11px] text-faint">
                  {progress.currentName}
                </p>
              )}

              {progress.destination && !running && (
                <p className="mt-2 text-[11px] text-faint">
                  Saved to {progress.destination}
                </p>
              )}

              {progress.message && (
                <p className="mt-2 text-[11px] text-danger">{progress.message}</p>
              )}

              {progress.failures.length > 0 && (
                <div className="mt-3 rounded border border-danger/30 bg-danger/10 p-2">
                  <p className="mb-1 text-[11px] font-medium text-danger">
                    {progress.failures.length} file
                    {progress.failures.length === 1 ? "" : "s"} failed
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {progress.failures.slice(0, 5).map((failure) => (
                      <li
                        key={failure.name}
                        className="truncate text-[10px] text-muted"
                      >
                        {failure.name} — {failure.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <span className="text-[11px] text-faint">
            {!progress && `${count} photo${count === 1 ? "" : "s"}`}
          </span>

          <div className="flex gap-2">
            {running && (
              <Button variant="danger" onClick={cancel}>
                Cancel
              </Button>
            )}
            {finished && <Button onClick={() => setOpen(false)}>Close</Button>}
            {!progress && (
              <Button
                variant="primary"
                disabled={count === 0}
                onClick={() => void start()}
                className="gap-1.5"
              >
                <Download size={14} />
                Export {count > 0 ? count : ""}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
