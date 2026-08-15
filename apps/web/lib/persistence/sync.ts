"use client";

import { useCatalogStore } from "@/stores/catalog-store";
import { useRecipeStore } from "@/stores/recipe-store";
import * as db from "./db";

let started = false;

function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let handle: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (handle !== null) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Called once at app start. Keeps IndexedDB mirroring the live stores so
 * edits and the last-opened folder survive a reload:
 *  - every recipe change gets written back (debounced, so a slider drag
 *    doesn't fire a write per frame) — a removed photo's recipe drops out
 *    for free since the whole map is rewritten each time, not diffed.
 *  - the directory handle is saved whenever a folder is opened and cleared
 *    whenever the catalog is (Close folder, or the fallback import path
 *    that never had one to begin with).
 * A write failure (private browsing, storage quota) is swallowed — losing
 * persistence is fine, breaking the editor over it is not.
 */
export function startPersistenceSync(): void {
  if (started) return;
  started = true;

  const saveRecipes = debounce((recipes: ReturnType<typeof useRecipeStore.getState>["recipes"]) => {
    void db.saveAllRecipes(recipes).catch(() => {});
  }, 500);

  useRecipeStore.subscribe((state) => saveRecipes(state.recipes));

  let lastHandle: FileSystemDirectoryHandle | null =
    useCatalogStore.getState().directoryHandle;
  useCatalogStore.subscribe((state) => {
    if (state.directoryHandle === lastHandle) return;
    lastHandle = state.directoryHandle;
    if (state.directoryHandle && state.directoryName) {
      void db.saveSession(state.directoryHandle, state.directoryName).catch(() => {});
    } else {
      void db.clearSession().catch(() => {});
    }
  });
}
