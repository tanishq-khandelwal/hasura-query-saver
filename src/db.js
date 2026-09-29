// Minimal IndexedDB wrapper for the saved-queries store.

const DB_NAME = "hasura-query-saver";
const DB_VERSION = 1;
const STORE = "queries";

let dbPromise;

function openDB() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Resolves once the transaction commits (not just when the request succeeds),
// so a write is durable by the time callers reload.
async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

export const dbGetAll = () => withStore("readonly", (s) => s.getAll());
export const dbAdd = (record) => withStore("readwrite", (s) => s.add(record));
export const dbPut = (record) => withStore("readwrite", (s) => s.put(record));
export const dbDelete = (id) => withStore("readwrite", (s) => s.delete(id));
// One transaction, so a bad record aborts the whole import instead of leaving half of it.
export const dbAddMany = (records) =>
  withStore("readwrite", (s) => {
    records.forEach((r) => s.add(r));
  });
