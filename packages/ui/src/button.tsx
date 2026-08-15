"use client";

import * as React from "react";
import { cn } from "./cn";

type Variant = "primary" | "default" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover border-transparent disabled:bg-accent/40",
  default:
    "bg-raised text-fg hover:bg-raised-hover border-line disabled:text-muted",
  ghost:
    "bg-transparent text-muted hover:text-fg hover:bg-raised border-transparent",
  danger:
    "bg-transparent text-danger hover:bg-danger/10 border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "default", size = "md", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-md border font-medium",
          "transition-colors select-none whitespace-nowrap",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-60",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      />
    );
  },
);
