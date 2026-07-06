import { DB_CONFIG } from 'database/types';

export function setupObjectStores(db: IDBDatabase): void {
  for (const [storeName, storeConfig] of Object.entries(DB_CONFIG.stores)) {
    if (!db.objectStoreNames.contains(storeName)) {
      const options: IDBObjectStoreParameters = {
        keyPath: storeConfig.keyPath,
      };
      if ('autoIncrement' in storeConfig) {
        options.autoIncrement = storeConfig.autoIncrement;
      }
      const store = db.createObjectStore(storeName, options);
      for (const index of storeConfig.indexes) {
        store.createIndex(index.name, index.keyPath);
      }
    }
  }
}

let cachedDB: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function clearDBCache(): void {
  cachedDB = null;
  dbPromise = null;
}

function handleVersionChange(): void {
  cachedDB?.close();
  clearDBCache();
}

function cacheDBConnection(db: IDBDatabase): IDBDatabase {
  cachedDB = db;
  cachedDB.onclose = clearDBCache;
  cachedDB.onversionchange = handleVersionChange;
  dbPromise = null;
  return cachedDB;
}

function rejectOpen(reject: (reason?: unknown) => void, message: string): void {
  dbPromise = null;
  reject(new Error(message));
}

function createOpenDBPromise(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = () => {
      rejectOpen(reject, 'Failed to open IndexedDB');
    };

    request.onblocked = () => {
      rejectOpen(reject, 'IndexedDB open blocked by another connection');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(cacheDBConnection(db));
    };

    request.onupgradeneeded = (event) => {
      setupObjectStores((event.target as IDBOpenDBRequest).result);
    };
  });
}

/**
 * Returns the single shared connection to the DTaaS IndexedDB database.
 * Every consumer (execution history, measurement history, logger) must go
 * through this function so that a version bump in one tab can close all
 * connections via onversionchange rather than hanging indefinitely waiting
 * on a connection that never releases the upgrade lock.
 */
export function openDB(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);
  if (dbPromise) return dbPromise;

  dbPromise = createOpenDBPromise();

  return dbPromise;
}

export function resetDBConnection(): void {
  if (cachedDB) {
    cachedDB.close();
  }
  clearDBCache();
}
