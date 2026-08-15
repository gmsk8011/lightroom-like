"use client";

import { cn, Panel } from "@lrl/ui";
import { useUiStore } from "@/stores/ui-store";
import { PresetsList } from "./presets-list";

export function LeftRail() {
  const leftOpen = useUiStore((s) => s.leftOpen);
  const mobileSheet = useUiStore((s) => s.mobileSheet);

  return (
    <aside
      className={cn(
        // Small screens: an overlay drawer.
        "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto",
        "border-r border-line bg-panel transition-transform duration-200",
        mobileSheet === "library" ? "translate-x-0" : "-translate-x-full",
        // Large screens: an in-flow column that collapses to zero width.
        "lg:relative lg:z-auto lg:translate-x-0",
        "lg:transition-[width] lg:duration-200",
        leftOpen ? "lg:w-60" : "lg:w-0 lg:border-r-0",
      )}
    >
      <div className="w-64">
        <Panel title="Presets">
          <PresetsList />
        </Panel>

      </div>
    </aside>
  );
}
