"use client";

import { FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@lrl/ui";
import { useImport } from "@/lib/catalog/use-import";

interface ImportControlProps {
  variant?: "primary" | "default" | "ghost";
  size?: "sm" | "md";
  label?: string;
  hideLabelOnSmall?: boolean;
}

export function ImportControl({
  variant = "default",
  size = "sm",
  label = "Import",
  hideLabelOnSmall = false,
}: ImportControlProps) {
  const { openPicker, onInputChange, attachInput, busy, error } = useImport();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => void openPicker()}
        disabled={busy}
        className="gap-1.5"
        title={error ?? undefined}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FolderOpen size={14} />
        )}
        <span className={hideLabelOnSmall ? "hidden sm:inline" : undefined}>
          {label}
        </span>
      </Button>

      <input
        ref={attachInput}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />
    </>
  );
}
