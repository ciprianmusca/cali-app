/**
 * Offline photo store in IndexedDB — keeps large images out of localStorage.
 * Keys: `${observationId}:${index}` → data-URI string.
 */

const DB_NAME = "cali-lab-photos";
const STORE = "photos";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB_unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb_open_failed"));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb_request_failed"));
  });
}

export function idbPhotoRef(obsId: string, index: number): string {
  return `idb:${obsId}:${index}`;
}

export function parseIdbPhotoRef(
  src: string
): { obsId: string; index: number } | null {
  if (!src.startsWith("idb:")) return null;
  const rest = src.slice(4);
  const idx = rest.lastIndexOf(":");
  if (idx < 0) return null;
  const obsId = rest.slice(0, idx);
  const index = Number.parseInt(rest.slice(idx + 1), 10);
  if (!obsId || !Number.isFinite(index)) return null;
  return { obsId, index };
}

export async function saveObservationPhotosToIdb(
  obsId: string,
  photos: string[]
): Promise<string[]> {
  const db = await openDb();
  const refs: string[] = [];
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (let i = 0; i < photos.length; i += 1) {
    const src = photos[i]!;
    if (typeof src === "string" && src.startsWith("data:")) {
      store.put(src, `${obsId}:${i}`);
      refs.push(idbPhotoRef(obsId, i));
    } else {
      refs.push(src);
    }
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb_tx_failed"));
  });
  db.close();
  return refs;
}

export async function loadIdbPhoto(
  obsId: string,
  index: number
): Promise<string | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const value = await idbReq(
      tx.objectStore(STORE).get(`${obsId}:${index}`)
    );
    return typeof value === "string" ? value : null;
  } finally {
    db.close();
  }
}

/** Expand idb: refs (and keep other refs) for sync upload payload. */
export async function hydratePhotosForSync(
  obsId: string,
  photos: string[]
): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < photos.length; i += 1) {
    const src = photos[i]!;
    const parsed = parseIdbPhotoRef(src);
    if (parsed) {
      const data = await loadIdbPhoto(parsed.obsId, parsed.index);
      if (data) out.push(data);
    } else if (src?.startsWith("data:")) {
      out.push(src);
    } else if (src) {
      out.push(src);
    }
  }
  return out;
}

export async function deleteObservationPhotosFromIdb(
  obsId: string
): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const keys = await idbReq(store.getAllKeys());
    for (const key of keys) {
      if (typeof key === "string" && key.startsWith(`${obsId}:`)) {
        store.delete(key);
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb_tx_failed"));
    });
  } finally {
    db.close();
  }
}
