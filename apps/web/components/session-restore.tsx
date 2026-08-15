"use client";

import * as React from "react";
import { FolderOpen, X } from "lucide-react";
import { Button } from "@lrl/ui";
import { walkDirectory } from "@/lib/catalog/import";
import type { Photo } from "@/lib/catalog/types";
import { thumbnails } from "@/lib/thumbnails/service";
import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import * as db from "@/lib/persistence/db";
import { startPersistenceSync } from "@/lib/persistence/sync";

type RestoreState =
  | { status: "idle" }
  | { status: "prompt"; handle: FileSystemDirectoryHandle; name: string }
  | { status: "restoring"; name: string };

/** IndexedDB can hang rather than reject — a stuck connection from another
 *  tab, private-browsing quirks, etc. Restoring the last session is a
 *  nicety; it should give up rather than leave the app stuck deciding
 *  whether to show anything. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err as Error);
      },
    );
  });
}

/**
 * Runs once at app start: rehydrates persisted recipes, then tries to
 * reopen the last folder. A still-granted permission restores silently; a
 * lapsed one (Chrome resets it fairly readily) surfaces a one-click prompt
 * instead of failing quietly, since `requestPermission` needs a real user
 * gesture and can't just be called from an effect.
 */
export function SessionRestore() {
  const [state, setState] = React.useState<RestoreState>({ status: "idle" });

  const restore = React.useCallback(
    async (handle: FileSystemDirectoryHandle, name: string) => {
      setState({ status: "restoring", name });
      try {
        const photos: Photo[] = [];
        const skipped = { count: 0 };
        await walkDirectory(handle, "", photos, skipped, 0);
        photos.sort((a, b) => a.relPath.localeCompare(b.relPath));
        thumbnails.reset();
        useCatalogStore.getState().addImport({
          photos,
          directoryHandle: handle,
          directoryName: name,
          skipped: skipped.count,
        });
      } catch {
        await db.clearSession().catch(() => {});
      }
      setState({ status: "idle" });
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;

    // Wired up immediately and unconditionally — if anything below (reading
    // IndexedDB, re-walking the restored folder) fails or hangs, ongoing
    // saves for whatever happens in *this* session still have to work, or
    // nothing would persist for the *next* reload either. Restoring the
    // last session is a nicety layered on top; it must never be a
    // precondition for saving the current one.
    startPersistenceSync();

    void (async () => {
      const recipes = await withTimeout(db.loadAllRecipes(), 4000).catch(() => ({}));
      if (!cancelled && Object.keys(recipes).length > 0) {
        useRecipeStore.getState().hydrate(recipes);
      }

      const session = await withTimeout(db.loadSession(), 4000).catch(() => null);
      if (!cancelled && session) {
        const { directoryHandle, directoryName } = session;
        try {
          const permission = await directoryHandle.queryPermission?.({
            mode: "readwrite",
          });
          if (permission === "granted") {
            await restore(directoryHandle, directoryName);
          } else {
            setState({ status: "prompt", handle: directoryHandle, name: directoryName });
          }
        } catch {
          await db.clearSession().catch(() => {});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restore]);

  async function dismiss() {
    await db.clearSession().catch(() => {});
    setState({ status: "idle" });
  }

  if (state.status === "prompt") {
    return (
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-accent/40 bg-accent/15 px-4 py-2.5 shadow-lg backdrop-blur">
        <FolderOpen size={16} className="shrink-0 text-accent" />
        <span className="text-sm text-fg">
          Reopen &ldquo;{state.name}&rdquo; to restore your last session — the
          browser needs you to confirm access again after a reload.
        </span>
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            const granted = await state.handle
              .requestPermission?.({ mode: "readwrite" })
              .catch(() => "denied" as const);
            if (granted === "granted") await restore(state.handle, state.name);
            else await dismiss();
          }}
        >
          Reopen folder
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => void dismiss()}
          className="shrink-0 text-faint transition-colors hover:text-fg"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (state.status === "restoring") {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center">
        <div className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-faint shadow-lg">
          <FolderOpen size={14} className="shrink-0 animate-pulse text-accent" />
          Reopening &ldquo;{state.name}&rdquo;…
        </div>
      </div>
    );
  }

  return null;
}
