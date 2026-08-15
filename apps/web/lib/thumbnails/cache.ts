import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "framer-cache";
const STORE = "thumbnails";
const DB_VERSION = 1;

/** Bump when thumbnail rendering changes, to invalidate every cached entry. */
const THUMB_GENERATION = 1;

export interface CachedThumbnail {
  blob: Blob;
  thumbWidth: number;
  thumbHeight: number;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
  return dbPromise;
}

function key(photoId: string): string {
  return `${THUMB_GENERATION}:${photoId}`;
}

export async function readThumbnail(
  photoId: string,
): Promise<CachedThumbnail | undefined> {
  try {
    const db = await getDb();
    return await db.get(STORE, key(photoId));
  } catch {
    // A broken or blocked cache must never stop the app — regenerate instead.
    return undefined;
  }
}

export async function writeThumbnail(
  photoId: string,
  value: CachedThumbnail,
): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, value, key(photoId));
  } catch {
    // Quota exceeded or private mode: thumbnails simply won't persist.
  }
}

export async function clearThumbnailCache(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
