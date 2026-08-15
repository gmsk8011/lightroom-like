"use client";

import * as React from "react";
import { cn } from "./cn";

/* ------------------------------------------------------------------ label */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] text-muted select-none">{children}</span>
  );
}

/* ------------------------------------------------------------------ colour */

export interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

export function ColorField({
  label,
  value,
  onChange,
  disabled,
}: ColorFieldProps) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  function commit(next: string) {
    const hex = next.startsWith("#") ? next : `#${next}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex.toLowerCase());
    else setDraft(value);
  }

  return (
    <div className={cn("flex items-center justify-between gap-2 py-1.5", disabled && "opacity-50")}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          }}
          aria-label={`${label} hex value`}
          className="w-20 rounded bg-raised px-1.5 py-1 font-mono text-[11px] uppercase text-fg outline-none focus:outline-1 focus:outline-accent"
        />
        <div className="relative size-6 shrink-0 overflow-hidden rounded border border-line">
          <div className="absolute inset-0" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- segmented */

export interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: number;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 3,
}: SegmentedProps<T>) {
  return (
    <div className="py-1.5">
      {label && (
        <div className="mb-1.5">
          <FieldLabel>{label}</FieldLabel>
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded border px-1.5 py-1.5 text-[11px] transition-colors",
                "focus-visible:outline-1 focus-visible:outline-accent",
                active
                  ? "border-accent/60 bg-accent/15 text-fg"
                  : "border-line bg-raised text-muted hover:bg-raised-hover hover:text-fg",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- toggle */

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1.5">
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          checked ? "bg-accent" : "bg-track",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------ input */

export interface TextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  maxLength,
}: TextFieldProps) {
  const shared = cn(
    "w-full rounded border border-line bg-raised px-2 py-1.5",
    "text-xs text-fg placeholder:text-faint",
    "outline-none focus:border-accent/60 focus:outline-1 focus:outline-accent/40",
  );

  return (
    <div className="py-1.5">
      {label && (
        <div className="mb-1.5">
          <FieldLabel>{label}</FieldLabel>
        </div>
      )}
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className={cn(shared, "resize-y leading-relaxed")}
        />
      ) : (
        <input
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className={shared}
        />
      )}
    </div>
  );
}
