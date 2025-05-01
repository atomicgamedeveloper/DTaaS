import { DB_CONFIG, ExecutionHistoryEntry } from '../model/executionHistory';

/**
 * Service for interacting with IndexedDB
 */
class IndexedDBService {
  private db: IDBDatabase | null = null;

  private dbName: string;

  private dbVersion: number;

  constructor() {
    this.dbName = DB_CONFIG.name;
    this.dbVersion = DB_CONFIG.version;
  }

  /**
   * Initialize the database
   * @returns Promise that resolves when the database is initialized
   */
  public async init(): Promise<void> {
    if (this.db) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores and indexes
        if (!db.objectStoreNames.contains('executionHistory')) {
          const store = db.createObjectStore('executionHistory', {
            keyPath: DB_CONFIG.stores.executionHistory.keyPath,
          });

          // Create indexes
          DB_CONFIG.stores.executionHistory.indexes.forEach((index) => {
            store.createIndex(index.name, index.keyPath);
          });
        }
      };
    });
  }

  /**
   * Add a new execution history entry
   * @param entry The execution history entry to add
   * @returns Promise that resolves with the ID of the added entry
   */
  public async addExecutionHistory(
    entry: ExecutionHistoryEntry,
  ): Promise<string> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const request = store.add(entry);

      request.onerror = () => {
        reject(new Error('Failed to add execution history'));
      };

      request.onsuccess = () => {
        resolve(entry.id);
      };
    });
  }

  /**
   * Update an existing execution history entry
   * @param entry The execution history entry to update
   * @returns Promise that resolves when the entry is updated
   */
  public async updateExecutionHistory(
    entry: ExecutionHistoryEntry,
  ): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const request = store.put(entry);

      request.onerror = () => {
        reject(new Error('Failed to update execution history'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get an execution history entry by ID
   * @param id The ID of the execution history entry
   * @returns Promise that resolves with the execution history entry
   */
  public async getExecutionHistoryById(
    id: string,
  ): Promise<ExecutionHistoryEntry | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['executionHistory'], 'readonly');
      const store = transaction.objectStore('executionHistory');
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error('Failed to get execution history'));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Get all execution history entries for a Digital Twin
   * @param dtName The name of the Digital Twin
   * @returns Promise that resolves with an array of execution history entries
   */
  public async getExecutionHistoryByDTName(
    dtName: string,
  ): Promise<ExecutionHistoryEntry[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['executionHistory'], 'readonly');
      const store = transaction.objectStore('executionHistory');
      const index = store.index('dtName');
      const request = index.getAll(dtName);

      request.onerror = () => {
        reject(new Error('Failed to get execution history by DT name'));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Get all execution history entries
   * @returns Promise that resolves with an array of all execution history entries
   */
  public async getAllExecutionHistory(): Promise<ExecutionHistoryEntry[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['executionHistory'], 'readonly');
      const store = transaction.objectStore('executionHistory');
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('Failed to get all execution history'));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Delete an execution history entry
   * @param id The ID of the execution history entry to delete
   * @returns Promise that resolves when the entry is deleted
   */
  public async deleteExecutionHistory(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error('Failed to delete execution history'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Delete all execution history entries for a Digital Twin
   * @param dtName The name of the Digital Twin
   * @returns Promise that resolves when all entries are deleted
   */
  public async deleteExecutionHistoryByDTName(dtName: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const index = store.index('dtName');
      const request = index.openCursor(IDBKeyRange.only(dtName));

      request.onerror = () => {
        reject(new Error('Failed to delete execution history by DT name'));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

// Create a singleton instance
const indexedDBService = new IndexedDBService();

// Export the singleton instance as default
export default indexedDBService;
