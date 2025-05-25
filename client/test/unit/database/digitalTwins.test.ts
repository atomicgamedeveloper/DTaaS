// eslint-disable-next-line import/no-extraneous-dependencies
import 'fake-indexeddb/auto';
import {
  ExecutionHistoryEntry,
  ExecutionStatus,
} from 'model/backend/gitlab/types/executionHistory';
import indexedDBService from 'database/digitalTwins';

if (typeof globalThis.structuredClone !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.structuredClone = (obj: any): any =>
    JSON.parse(JSON.stringify(obj));
}

async function clearDatabase() {
  try {
    const entries = await indexedDBService.getAllExecutionHistory();
    await Promise.all(
      entries.map((entry) => indexedDBService.deleteExecutionHistory(entry.id)),
    );
  } catch (error) {
    throw new Error(`Failed to clear database: ${error}`);
  }
}

describe('IndexedDBService (Real Implementation)', () => {
  beforeEach(async () => {
    await indexedDBService.init();
    await clearDatabase();
  });

  describe('init', () => {
    it('should initialize the database', async () => {
      await expect(indexedDBService.init()).resolves.not.toThrow();
    });
  });

  describe('addExecutionHistory and getExecutionHistoryById', () => {
    it('should add an execution history entry and retrieve it by ID', async () => {
      const entry: ExecutionHistoryEntry = {
        id: 'test-id-123',
        dtName: 'test-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      const resultId = await indexedDBService.addExecutionHistory(entry);
      expect(resultId).toBe(entry.id);

      const retrievedEntry = await indexedDBService.getExecutionHistoryById(
        entry.id,
      );
      expect(retrievedEntry).not.toBeNull();
      expect(retrievedEntry).toEqual(entry);
    });

    it('should return null when getting a non-existent entry', async () => {
      const result =
        await indexedDBService.getExecutionHistoryById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('updateExecutionHistory', () => {
    it('should update an existing execution history entry', async () => {
      const entry: ExecutionHistoryEntry = {
        id: 'test-id-456',
        dtName: 'test-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };
      await indexedDBService.addExecutionHistory(entry);

      const updatedEntry = {
        ...entry,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [{ jobName: 'job1', log: 'log content' }],
      };
      await indexedDBService.updateExecutionHistory(updatedEntry);

      const retrievedEntry = await indexedDBService.getExecutionHistoryById(
        entry.id,
      );
      expect(retrievedEntry).toEqual(updatedEntry);
      expect(retrievedEntry?.status).toBe(ExecutionStatus.COMPLETED);
      expect(retrievedEntry?.jobLogs).toHaveLength(1);
    });
  });

  describe('getExecutionHistoryByDTName', () => {
    it('should retrieve entries by digital twin name', async () => {
      const dtName = 'test-dt-multi';
      const entries = [
        {
          id: 'multi-1',
          dtName,
          pipelineId: 101,
          timestamp: Date.now() - 1000,
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
        {
          id: 'multi-2',
          dtName,
          pipelineId: 102,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
        {
          id: 'other-dt',
          dtName: 'other-dt',
          pipelineId: 103,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
      ];

      await Promise.all(
        entries.map((entry) => indexedDBService.addExecutionHistory(entry)),
      );

      // Retrieve by DT name
      const result = await indexedDBService.getExecutionHistoryByDTName(dtName);

      // Verify results
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result.every((entry) => entry.dtName === dtName)).toBe(true);
      expect(result.find((entry) => entry.id === 'multi-1')).toBeTruthy();
      expect(result.find((entry) => entry.id === 'multi-2')).toBeTruthy();
    });

    it('should return an empty array when no entries exist for a DT', async () => {
      const result =
        await indexedDBService.getExecutionHistoryByDTName('non-existent-dt');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getAllExecutionHistory', () => {
    it('should retrieve all execution history entries', async () => {
      const entries = [
        {
          id: 'all-1',
          dtName: 'dt-1',
          pipelineId: 201,
          timestamp: Date.now() - 1000,
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
        {
          id: 'all-2',
          dtName: 'dt-2',
          pipelineId: 202,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
      ];

      await Promise.all(
        entries.map((entry) => indexedDBService.addExecutionHistory(entry)),
      );

      const result = await indexedDBService.getAllExecutionHistory();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result.find((entry) => entry.id === 'all-1')).toBeTruthy();
      expect(result.find((entry) => entry.id === 'all-2')).toBeTruthy();
    });
  });

  describe('deleteExecutionHistory', () => {
    it('should delete an execution history entry by ID', async () => {
      // First, add an entry
      const entry: ExecutionHistoryEntry = {
        id: 'delete-id',
        dtName: 'test-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };
      await indexedDBService.addExecutionHistory(entry);

      // Verify it exists
      let retrievedEntry = await indexedDBService.getExecutionHistoryById(
        entry.id,
      );
      expect(retrievedEntry).not.toBeNull();

      // Delete it
      await indexedDBService.deleteExecutionHistory(entry.id);

      retrievedEntry = await indexedDBService.getExecutionHistoryById(entry.id);
      expect(retrievedEntry).toBeNull();
    });
  });

  describe('deleteExecutionHistoryByDTName', () => {
    it('should delete all execution history entries for a digital twin', async () => {
      // Add multiple entries for the same DT
      const dtName = 'delete-dt';
      const entries = [
        {
          id: 'delete-dt-1',
          dtName,
          pipelineId: 301,
          timestamp: Date.now() - 1000,
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
        {
          id: 'delete-dt-2',
          dtName,
          pipelineId: 302,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
        {
          id: 'keep-dt',
          dtName: 'keep-dt',
          pipelineId: 303,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
      ];

      await Promise.all(
        entries.map((entry) => indexedDBService.addExecutionHistory(entry)),
      );

      await indexedDBService.deleteExecutionHistoryByDTName(dtName);

      const deletedEntries =
        await indexedDBService.getExecutionHistoryByDTName(dtName);
      expect(deletedEntries.length).toBe(0);

      // Verify other entries still exist
      const keptEntry =
        await indexedDBService.getExecutionHistoryById('keep-dt');
      expect(keptEntry).not.toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle database initialization errors', async () => {
      const originalOpen = indexedDB.open;
      indexedDB.open = jest.fn().mockImplementation(() => {
        const request = {
          onerror: null as ((event: Event) => void) | null,
          onsuccess: null as ((event: Event) => void) | null,
          onupgradeneeded: null as
            | ((event: IDBVersionChangeEvent) => void)
            | null,
        };
        setTimeout(() => {
          if (request.onerror) request.onerror(new Event('error'));
        }, 0);
        return request;
      });

      const { default: IndexedDBService } = await import(
        'database/digitalTwins'
      );
      const newService = Object.create(Object.getPrototypeOf(IndexedDBService));
      newService.db = null;
      newService.dbName = 'test-db';
      newService.dbVersion = 1;

      await expect(newService.init()).rejects.toThrow(
        'Failed to open IndexedDB',
      );

      indexedDB.open = originalOpen;
    });

    it('should handle multiple init calls gracefully', async () => {
      await expect(indexedDBService.init()).resolves.not.toThrow();
      await expect(indexedDBService.init()).resolves.not.toThrow();
      await expect(indexedDBService.init()).resolves.not.toThrow();
    });

    it('should handle add operation errors', async () => {
      const entry: ExecutionHistoryEntry = {
        id: 'error-test',
        dtName: 'test-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      await indexedDBService.addExecutionHistory(entry);

      await expect(indexedDBService.addExecutionHistory(entry)).rejects.toThrow(
        'Failed to add execution history',
      );
    });

    it('should handle empty results gracefully', async () => {
      const allEntries = await indexedDBService.getAllExecutionHistory();
      expect(allEntries).toEqual([]);

      const dtEntries =
        await indexedDBService.getExecutionHistoryByDTName('non-existent');
      expect(dtEntries).toEqual([]);

      const singleEntry =
        await indexedDBService.getExecutionHistoryById('non-existent');
      expect(singleEntry).toBeNull();
    });

    it('should handle delete operations on non-existent entries', async () => {
      await expect(
        indexedDBService.deleteExecutionHistory('non-existent'),
      ).resolves.not.toThrow();

      await expect(
        indexedDBService.deleteExecutionHistoryByDTName('non-existent'),
      ).resolves.not.toThrow();
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent add operations', async () => {
      const entries = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-${i}`,
        dtName: 'concurrent-dt',
        pipelineId: 100 + i,
        timestamp: Date.now() + i,
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      }));

      await Promise.all(
        entries.map((entry) => indexedDBService.addExecutionHistory(entry)),
      );

      const result =
        await indexedDBService.getExecutionHistoryByDTName('concurrent-dt');
      expect(result.length).toBe(5);
    });

    it('should handle concurrent read/write operations', async () => {
      const entry: ExecutionHistoryEntry = {
        id: 'rw-test',
        dtName: 'rw-dt',
        pipelineId: 999,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      const operations = [
        indexedDBService.addExecutionHistory(entry),
        indexedDBService.getExecutionHistoryByDTName('rw-dt'),
        indexedDBService.getAllExecutionHistory(),
      ];

      await Promise.all(operations);

      const result = await indexedDBService.getExecutionHistoryById('rw-test');
      expect(result).not.toBeNull();
    });
  });

  describe('data integrity', () => {
    it('should preserve data types and structure', async () => {
      const entry: ExecutionHistoryEntry = {
        id: 'integrity-test',
        dtName: 'integrity-dt',
        pipelineId: 12345,
        timestamp: 1640995200000, // Specific timestamp
        status: ExecutionStatus.COMPLETED,
        jobLogs: [
          { jobName: 'job1', log: 'log content 1' },
          { jobName: 'job2', log: 'log content 2' },
        ],
      };

      await indexedDBService.addExecutionHistory(entry);
      const retrieved =
        await indexedDBService.getExecutionHistoryById('integrity-test');

      expect(retrieved).toEqual(entry);
      expect(typeof retrieved?.pipelineId).toBe('number');
      expect(typeof retrieved?.timestamp).toBe('number');
      expect(Array.isArray(retrieved?.jobLogs)).toBe(true);
      expect(retrieved?.jobLogs.length).toBe(2);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: `large-${i}`,
        dtName: `dt-${i % 5}`, // 5 different DTs
        pipelineId: 1000 + i,
        timestamp: Date.now() + i * 1000,
        status:
          i % 2 === 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.RUNNING,
        jobLogs: Array.from({ length: 3 }, (__, j) => ({
          jobName: `job-${j}`,
          log: `Log content for job ${j} in execution ${i}`,
        })),
      }));

      await Promise.all(
        largeDataset.map((entry) =>
          indexedDBService.addExecutionHistory(entry),
        ),
      );

      const allEntries = await indexedDBService.getAllExecutionHistory();
      expect(allEntries.length).toBe(50);

      const dt0Entries =
        await indexedDBService.getExecutionHistoryByDTName('dt-0');
      expect(dt0Entries.length).toBe(10); // Every 5th entry
    });
  });
});
