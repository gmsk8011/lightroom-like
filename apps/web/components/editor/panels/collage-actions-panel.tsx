"use client";

import { Repeat, Trash2 } from "lucide-react";
import { Button, Panel } from "@lrl/ui";
import { useCollageStore } from "@/stores/collage-store";

export function CollageActionsPanel() {
  const selectedCells = useCollageStore((s) => s.selectedCells);
  const swapSelected = useCollageStore((s) => s.swapSelected);
  const clearCell = useCollageStore((s) => s.clearCell);
  const clearAll = useCollageStore((s) => s.clearAll);

  return (
    <Panel title="Cells">
      <p className="-mt-1 mb-2 text-[10px] leading-relaxed text-faint">
        Click a cell to select it, then click a photo in the filmstrip to
        fill it. Select two filled cells to swap them.
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          disabled={selectedCells.length !== 2}
          onClick={swapSelected}
        >
          <Repeat size={13} className="mr-1.5" />
          Swap
        </Button>
        <Button
          size="sm"
          disabled={selectedCells.length !== 1}
          onClick={() => {
            const index = selectedCells[0];
            if (index !== undefined) clearCell(index);
          }}
        >
          Clear cell
        </Button>
        <Button size="sm" variant="danger" onClick={clearAll}>
          <Trash2 size={13} className="mr-1.5" />
          Clear all
        </Button>
      </div>
    </Panel>
  );
}
