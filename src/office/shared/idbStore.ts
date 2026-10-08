/**
 * A tiny key-value store over one IndexedDB object store, keyed by `id`.
 * Writer and Calc each keep their drafts in their own database, so a
 * schema change in one never has to bump the other.
 */
export interface IdbStore {
  get(id: string): Promise<unknown>;
  put(value: { id: string }): Promise<void>;
  delete(id: string): Promise<void>;
  getAll(): Promise<unknown[]>;
}

export function openIdbStore(dbName: string, storeName: string): IdbStore {
  let opening: Promise<IDBDatabase> | null = null;

  const open = (): Promise<IDBDatabase> => {
    if (opening) return opening;
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    }).catch((error) => {
      // A later call may succeed (another tab was holding an old version).
      opening = null;
      throw error;
    });
    return opening;
  };

  const run = <T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const transaction = db.transaction(storeName, mode);
          const request = body(transaction.objectStore(storeName));
          transaction.oncomplete = () => resolve(request.result);
          transaction.onerror = () => reject(transaction.error ?? request.error);
          transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
        }),
    );

  return {
    get: (id) => run('readonly', (store) => store.get(id)),
    put: async (value) => {
      await run('readwrite', (store) => store.put(value));
    },
    delete: async (id) => {
      await run('readwrite', (store) => store.delete(id));
    },
    getAll: () => run('readonly', (store) => store.getAll()),
  };
}

export function newDraftId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export interface DraftSummary {
  id: string;
  title: string;
  updatedAt: number;
}
