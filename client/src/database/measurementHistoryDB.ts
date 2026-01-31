import { DB_CONFIG } from 'database/types';
import { TimedTask } from 'model/backend/gitlab/measure/benchmark.types';

export type MeasurementRecord = {
  id: string;
  taskName: string;
  timestamp: number;
  task: TimedTask;
};

/**
 * Service for interacting with the measurementHistory store in IndexedDB
 */
class MeasurementDBService {
  private db: IDBDatabase | undefined;

  private readonly dbName: string;

  private readonly dbVersion: number;

  private initPromise: Promise<void> | undefined;

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
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        this.initPromise = undefined;
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.initPromise = undefined;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('executionHistory')) {
          const store = db.createObjectStore('executionHistory', {
            keyPath: DB_CONFIG.stores.executionHistory.keyPath,
          });

          for (const index of DB_CONFIG.stores.executionHistory.indexes) {
            store.createIndex(index.name, index.keyPath);
          }
        }

        if (!db.objectStoreNames.contains('measurementHistory')) {
          const store = db.createObjectStore('measurementHistory', {
            keyPath: DB_CONFIG.stores.measurementHistory.keyPath,
          });

          for (const index of DB_CONFIG.stores.measurementHistory.indexes) {
            store.createIndex(index.name, index.keyPath);
          }
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Add a measurement record
   * @param task The timed task to store
   * @returns Promise that resolves with the ID of the added entry
   */
  public async add(task: TimedTask): Promise<string> {
    await this.init();

    const id = `${task['Task Name']}-${Date.now()}`;
    const record: MeasurementRecord = {
      id,
      taskName: task['Task Name'],
      timestamp: Date.now(),
      task,
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(
          new Error('Database not initialized - init() must be called first'),
        );
        return;
      }

      const transaction = this.db.transaction(
        ['measurementHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('measurementHistory');
      const request = store.add(record);

      request.onerror = () => {
        reject(new Error('Failed to add measurement record'));
      };

      request.onsuccess = () => {
        resolve(id);
      };
    });
  }

  /**
   * Get all measurement records
   * @returns Promise that resolves with an array of all measurement records
   */
  public async getAll(): Promise<MeasurementRecord[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['measurementHistory'],
        'readonly',
      );
      const store = transaction.objectStore('measurementHistory');
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('Failed to get all measurement records'));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Get measurement records by task name
   * @param taskName The name of the task
   * @returns Promise that resolves with an array of measurement records
   */
  public async getByTaskName(taskName: string): Promise<MeasurementRecord[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['measurementHistory'],
        'readonly',
      );
      const store = transaction.objectStore('measurementHistory');
      const index = store.index('taskName');
      const request = index.getAll(taskName);

      request.onerror = () => {
        reject(new Error('Failed to get measurement records by task name'));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Delete all measurement records (purge)
   * @returns Promise that resolves when all records are deleted
   */
  public async purge(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['measurementHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('measurementHistory');
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Failed to purge measurement records'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Delete a specific measurement record
   * @param id The ID of the measurement record to delete
   * @returns Promise that resolves when the record is deleted
   */
  public async delete(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['measurementHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('measurementHistory');
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error('Failed to delete measurement record'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

const measurementDBService = new MeasurementDBService();

export default measurementDBService;
