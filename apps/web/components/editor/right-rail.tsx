"use client";

import { cn } from "@lrl/ui";
import { useUiStore } from "@/stores/ui-store";
import { FiltersPanel } from "./panels/filters-panel";
import { BorderPanel } from "./panels/border-panel";
import { CaptionPanel } from "./panels/caption-panel";

export function RightRail() {
  const rightOpen = useUiStore((s) => s.rightOpen);
  const mobileSheet = useUiStore((s) => s.mobileSheet);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 w-72 shrink-0 overflow-x-hidden overflow-y-auto",
        "border-l border-line bg-panel transition-transform duration-200",
        mobileSheet === "adjust" ? "translate-x-0" : "translate-x-full",
        "lg:relative lg:z-auto lg:translate-x-0",
        "lg:transition-[width] lg:duration-200",
        rightOpen ? "lg:w-72" : "lg:w-0 lg:border-l-0",
      )}
    >
      <div className="w-72">
        <FiltersPanel />
        <BorderPanel />
        <CaptionPanel />
      </div>
    </aside>
  );
}
