"use client";

import * as React from "react";
import { cn } from "./cn";

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Double-clicking the row snaps back to this. Defaults to 0. */
  defaultValue?: number;
  /** Decimal places shown in the readout. */
  precision?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  /** Fired once when a drag gesture ends — use it to commit an undo entry. */
  onCommit?: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  defaultValue = 0,
  precision = 2,
  disabled = false,
  onChange,
  onCommit,
}: SliderProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const pct = (value - min) / (max - min);
  // Bipolar sliders fill outward from the centre, like Lightroom's, so a
  // glance tells you which direction the adjustment went.
  const bipolar = min < 0 && max > 0;
  const zeroPct = bipolar ? (0 - min) / (max - min) : 0;
  const fillStart = bipolar ? Math.min(pct, zeroPct) : 0;
  const fillEnd = bipolar ? Math.max(pct, zeroPct) : pct;
  const modified = Math.abs(value - defaultValue) > 1e-6;

  function commitDraft() {
    const parsed = Number.parseFloat(draft);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      onCommit?.(clamped);
    }
    setEditing(false);
  }

  return (
    <div
      className={cn("group py-1", disabled && "opacity-50")}
      onDoubleClick={() => {
        if (disabled) return;
        onChange(defaultValue);
        onCommit?.(defaultValue);
      }}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted select-none">{label}</span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDraft();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-14 rounded bg-raised px-1 text-right font-mono text-[11px] text-fg tabular-nums outline-1 outline-accent"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setDraft(value.toFixed(precision));
              setEditing(true);
            }}
            className={cn(
              "rounded px-1 font-mono text-[11px] tabular-nums transition-colors",
              "hover:bg-raised",
              modified ? "text-fg" : "text-muted",
            )}
          >
            {value.toFixed(precision)}
          </button>
        )}
      </div>

      <div className="relative flex h-4 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-track" />
        <div
          className="absolute h-1 rounded-full bg-accent"
          style={{
            left: `${fillStart * 100}%`,
            width: `${Math.max(0, fillEnd - fillStart) * 100}%`,
          }}
        />
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          onPointerUp={() => onCommit?.(value)}
          onKeyUp={() => onCommit?.(value)}
          className={cn(
            "relative h-4 w-full cursor-ew-resize appearance-none bg-transparent",
            "focus-visible:outline-none",
            "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/40",
            "[&::-webkit-slider-thumb]:bg-thumb [&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:transition-transform",
            "group-hover:[&::-webkit-slider-thumb]:scale-115",
            "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border",
            "[&::-moz-range-thumb]:border-black/40 [&::-moz-range-thumb]:bg-thumb",
          )}
        />
      </div>
    </div>
  );
}
