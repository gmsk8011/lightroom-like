"use client";

import * as React from "react";
import { Check, CopyCheck } from "lucide-react";
import { Button } from "@lrl/ui";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";

/**
 * Copies the active photo's full recipe — filters, border, and caption —
 * onto every other photo currently imported. Photos don't share a recipe by
 * default (each keeps its own edits), so this is the explicit "make them all
 * match this one" action, the same role Lightroom's Sync/Copy Settings plays.
 */
export function ApplyToAllButton() {
  const activeId = useCatalogStore((s) => s.activeId);
  const order = useCatalogStore((s) => s.order);
  const applyToAll = useRecipeStore((s) => s.applyToAll);
  const [justApplied, setJustApplied] = React.useState(false);

  const targetCount = order.length - 1;
  const disabled = !activeId || targetCount <= 0;

  function handleClick() {
    if (!activeId) return;
    applyToAll(activeId, order);
    setJustApplied(true);
    window.setTimeout(() => setJustApplied(false), 1600);
  }

  return (
    <Button
      size="sm"
      variant="default"
      className="gap-1.5"
      disabled={disabled}
      onClick={handleClick}
      title={
        disabled
          ? "Import more than one photo to use this"
          : `Copy this photo's edits to all ${order.length} photos`
      }
    >
      {justApplied ? (
        <>
          <Check size={14} className="text-success" />
          <span className="hidden sm:inline">Applied</span>
        </>
      ) : (
        <>
          <CopyCheck size={14} />
          <span className="hidden sm:inline">Apply to All</span>
        </>
      )}
    </Button>
  );
}
