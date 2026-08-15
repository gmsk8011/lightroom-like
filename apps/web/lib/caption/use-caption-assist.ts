"use client";

import * as React from "react";
import type {
  AssistChange,
  AssistMode,
  AssistResult,
} from "@/app/api/caption/assist/route";

export type { AssistChange, AssistMode, AssistResult };

type Status = "idle" | "loading" | "ready" | "error";

export function useCaptionAssist() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [changes, setChanges] = React.useState<AssistChange[]>([]);
  const [corrected, setCorrected] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  const reset = React.useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setChanges([]);
    setCorrected(null);
    setError(null);
  }, []);

  const run = React.useCallback(async (text: string, mode: AssistMode) => {
    // A new request supersedes any in flight — the old answer is stale the
    // moment the caption changes.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/caption/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, mode }),
        signal: controller.signal,
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Couldn't check that caption.";
        setError(message);
        setStatus("error");
        return;
      }

      const result = payload as AssistResult;
      setChanges(result.changes);
      setCorrected(result.corrected);
      setStatus("ready");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Couldn't reach the caption service.");
      setStatus("error");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  const dismissChange = React.useCallback((index: number) => {
    setChanges((current) => current.filter((_, i) => i !== index));
  }, []);

  React.useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  return {
    status,
    changes,
    corrected,
    error,
    run,
    reset,
    dismissChange,
  };
}

/** Applies one suggested edit to the caption, leaving the rest untouched. */
export function applyChange(text: string, change: AssistChange): string {
  const at = text.indexOf(change.from);
  if (at === -1) return text;
  return text.slice(0, at) + change.to + text.slice(at + change.from.length);
}
