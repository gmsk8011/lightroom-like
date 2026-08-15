import { openDB, type IDBPDatabase } from "idb";
import type { EditRecipe } from "@lrl/engine";

const DB_NAME = "framer-session";
const DB_VERSION = 1;
const RECIPES_STORE = "recipes";
const SESSION_STORE = "session";
const SESSION_KEY = "current";

export interface SessionRecord {
  directoryHandle: FileSystemDirectoryHandle;
  directoryName: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(RECIPES_STORE)) {
        db.createObjectStore(RECIPES_STORE);
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE);
      }
    },
  });
  return dbPromise;
}

export async function loadAllRecipes(): Promise<Record<string, EditRecipe>> {
  const db = await getDb();
  const keys = await db.getAllKeys(RECIPES_STORE);
  const values = await db.getAll(RECIPES_STORE);
  const out: Record<string, EditRecipe> = {};
  keys.forEach((key, i) => {
    out[String(key)] = values[i] as EditRecipe;
  });
  return out;
}

/** Rewrites the whole recipes store on every call rather than diffing — the
 *  data is small (a few hundred photos' worth of recipe JSON is still well
 *  under a megabyte). This is the *debounced* path used for ordinary edits
 *  (see sync.ts); it deliberately lags behind the live store by up to
 *  500ms, which is fine for a slider drag but not for a delete — see
 *  `deleteRecipes` for why removal doesn't go through here. */
export async function saveAllRecipes(
  recipes: Record<string, EditRecipe>,
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(RECIPES_STORE, "readwrite");
  await tx.store.clear();
  await Promise.all(
    Object.entries(recipes).map(([id, recipe]) => tx.store.put(recipe, id)),
  );
  await tx.done;
}

/** Deletes specific recipes immediately, bypassing the debounce that
 *  `saveAllRecipes` runs on. A removed photo's recipe has to be gone
 *  *now*: if the debounced full-rewrite were the only path, reloading in
 *  the window before it fires would let the stale recipe survive in
 *  IndexedDB and reattach the moment the same photo was re-imported —
 *  exactly the "removing and re-adding should start fresh" case this
 *  exists to guarantee. */
export async function deleteRecipes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(RECIPES_STORE, "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function clearAllRecipes(): Promise<void> {
  const db = await getDb();
  await db.clear(RECIPES_STORE);
}

export async function saveSession(
  directoryHandle: FileSystemDirectoryHandle,
  directoryName: string,
): Promise<void> {
  const db = await getDb();
  const record: SessionRecord = { directoryHandle, directoryName };
  await db.put(SESSION_STORE, record, SESSION_KEY);
}

export async function loadSession(): Promise<SessionRecord | null> {
  const db = await getDb();
  const record = (await db.get(SESSION_STORE, SESSION_KEY)) as
    | SessionRecord
    | undefined;
  return record ?? null;
}

export async function clearSession(): Promise<void> {
  const db = await getDb();
  await db.delete(SESSION_STORE, SESSION_KEY);
}
