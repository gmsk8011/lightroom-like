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

/** Rewrites the whole recipes store on every call rather than diffing —
 *  the data is small (a few hundred photos' worth of recipe JSON is still
 *  well under a megabyte) and this keeps a removed photo's persisted
 *  recipe disappearing for free, with no separate delete path to keep in
 *  sync. */
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
