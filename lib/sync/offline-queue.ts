export interface PendingOp {
  id: number;
  queuedAt: number;
  table: string;
  kind: "upsert" | "delete";
  row: object;
}

const DB_NAME = "budget-offline-queue";
const STORE = "ops";

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class OfflineQueue {
  private dbName: string;
  constructor(scope = DB_NAME) {
    this.dbName = scope;
  }

  async enqueue(op: Omit<PendingOp, "id" | "queuedAt">): Promise<number> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).add({ ...op, queuedAt: Date.now() } as PendingOp);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async list(): Promise<PendingOp[]> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PendingOp[]);
      req.onerror = () => reject(req.error);
    });
  }

  async size(): Promise<number> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async removeIds(ids: number[]): Promise<void> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const id of ids) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
