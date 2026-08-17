"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

export interface PanelProps {
  title: string;
  defaultOpen?: boolean;
  /** Controlled open state — when provided, the panel no longer tracks its
   *  own open/closed state internally, and `onOpenChange` becomes required
   *  to actually toggle it. Lets a parent read (and drive) whether a
   *  specific panel is expanded, e.g. to swap what the main canvas shows. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Panel({
  title,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  actions,
  children,
  className,
}: PanelProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  function toggle() {
    const next = !open;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <section className={cn("border-b border-line", className)}>
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={cn(
            "flex flex-1 items-center gap-1.5 px-3 py-2.5 text-left",
            "text-[11px] font-semibold tracking-wider uppercase",
            "text-muted hover:text-fg transition-colors",
          )}
        >
          <ChevronDown
            size={13}
            className={cn(
              "transition-transform duration-150",
              !open && "-rotate-90",
            )}
          />
          {title}
        </button>
        {actions}
      </div>
      {open && <div className="px-3 pt-0.5 pb-3.5">{children}</div>}
    </section>
  );
}
