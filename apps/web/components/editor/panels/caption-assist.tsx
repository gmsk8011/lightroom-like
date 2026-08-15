"use client";

import * as React from "react";
import { Check, Loader2, Sparkles, SpellCheck, X } from "lucide-react";
import { Button, cn } from "@lrl/ui";
import { DEFAULT_CAPTION } from "@lrl/engine";
import {
  applyChange,
  useCaptionAssist,
  type AssistChange,
} from "@/lib/caption/use-caption-assist";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";

const TYPE_LABELS: Record<AssistChange["type"], string> = {
  grammar: "Grammar",
  spelling: "Spelling",
  punctuation: "Punctuation",
  style: "Style",
  clarity: "Clarity",
};

export function CaptionAssist() {
  const photoId = useCatalogStore((s) => s.activeId);
  const text = useRecipeStore((s) =>
    photoId ? (s.recipes[photoId]?.caption.text ?? DEFAULT_CAPTION.text) : DEFAULT_CAPTION.text,
  );
  const setCaption = useRecipeStore((s) => s.setCaption);
  const { status, changes, corrected, error, run, reset, dismissChange } =
    useCaptionAssist();

  const trimmed = text.trim();
  const busy = status === "loading";

  // A suggestion is only valid for the text it was made against.
  const checkedText = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (checkedText.current !== null && checkedText.current !== text) {
      checkedText.current = null;
      reset();
    }
  }, [text, reset]);

  function check(mode: "grammar" | "improve") {
    checkedText.current = text;
    void run(trimmed, mode);
  }

  function accept(change: AssistChange, index: number) {
    if (!photoId) return;
    const current =
      useRecipeStore.getState().recipes[photoId]?.caption.text ?? DEFAULT_CAPTION.text;
    const next = applyChange(current, change);
    checkedText.current = next;
    setCaption(photoId, "text", next);
    dismissChange(index);
  }

  function acceptAll() {
    if (!corrected || !photoId) return;
    checkedText.current = corrected;
    setCaption(photoId, "text", corrected);
    reset();
  }

  return (
    <div className="mt-1 border-t border-line pt-2.5">
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          disabled={busy || trimmed.length === 0}
          onClick={() => check("grammar")}
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <SpellCheck size={13} />
          )}
          Check
        </Button>
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          disabled={busy || trimmed.length === 0}
          onClick={() => check("improve")}
        >
          <Sparkles size={13} />
          Improve
        </Button>
      </div>

      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}

      {status === "ready" && changes.length === 0 && (
        <p className="mt-2 text-[11px] text-faint">
          No changes suggested — this reads well.
        </p>
      )}

      {changes.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {changes.map((change, index) => (
            <div
              key={`${change.from}-${index}`}
              className="rounded border border-line bg-raised p-2"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="text-[10px] font-medium tracking-wide text-muted uppercase">
                  {TYPE_LABELS[change.type]}
                </span>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    aria-label={`Accept: change "${change.from}" to "${change.to}"`}
                    onClick={() => accept(change, index)}
                    className="rounded p-1 text-muted transition-colors hover:bg-success/20 hover:text-success"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Reject this suggestion"
                    onClick={() => dismissChange(index)}
                    className="rounded p-1 text-muted transition-colors hover:bg-danger/20 hover:text-danger"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed">
                <span className="text-danger/90 line-through">{change.from}</span>
                <span className="mx-1 text-faint">→</span>
                <span className="text-success">{change.to}</span>
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-faint">
                {change.reason}
              </p>
            </div>
          ))}

          {corrected && changes.length > 1 && (
            <Button
              size="sm"
              variant="primary"
              className={cn("mt-0.5 w-full")}
              onClick={acceptAll}
            >
              Accept all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
