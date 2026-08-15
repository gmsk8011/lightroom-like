"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

export interface PanelProps {
  title: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Panel({
  title,
  defaultOpen = true,
  actions,
  children,
  className,
}: PanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className={cn("border-b border-line", className)}>
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
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
