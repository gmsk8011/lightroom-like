"use client";

import { cn } from "@lrl/ui";
import { useUiStore } from "@/stores/ui-store";
import { CollageGridPanel } from "../panels/collage-grid-panel";

export function CollageLeftRail() {
  const leftOpen = useUiStore((s) => s.leftOpen);
  const mobileSheet = useUiStore((s) => s.mobileSheet);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-x-hidden overflow-y-auto",
        "border-r border-line bg-panel transition-transform duration-200",
        mobileSheet === "library" ? "translate-x-0" : "-translate-x-full",
        "lg:relative lg:z-auto lg:translate-x-0",
        "lg:transition-[width] lg:duration-200",
        leftOpen ? "lg:w-60" : "lg:w-0 lg:border-r-0",
      )}
    >
      <div className="w-64">
        <CollageGridPanel />
      </div>
    </aside>
  );
}
