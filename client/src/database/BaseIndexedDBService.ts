import { openDB } from 'database/dbConnection';

export interface CursorQuery {
  storeName: string;
  indexName: string;
  key: IDBValidKey;
}

export default abstract class BaseIndexedDBService {
  protected db: IDBDatabase | undefined;

  public async init(): Promise<void> {
    this.db = await openDB();
  }

  protected async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
    errorMessage: string,
  ): Promise<T> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(
          new Error('Database not initialized - init() must be called first'),
        );
        return;
      }

      const transaction = this.db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onerror = () => {
        reject(new Error(errorMessage));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  protected async withCursor(
    query: CursorQuery,
    cursorAction: (cursor: IDBCursorWithValue) => void,
    errorMessage: string,
  ): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(
          new Error('Database not initialized - init() must be called first'),
        );
        return;
      }

      const transaction = this.db.transaction([query.storeName], 'readwrite');
      const store = transaction.objectStore(query.storeName);
      const index = store.index(query.indexName);
      const request = index.openCursor(IDBKeyRange.only(query.key));

      request.onerror = () => {
        reject(new Error(errorMessage));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursorAction(cursor);
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}
