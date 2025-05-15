// eslint-disable-next-line import/no-extraneous-dependencies
import 'fake-indexeddb/auto';
import {
  ExecutionHistoryEntry,
  ExecutionStatus,
} from 'preview/model/executionHistory';
import indexedDBService from 'preview/services/indexedDBService';

// Add structuredClone polyfill for Node.js environment
if (typeof globalThis.structuredClone !== 'function') {
  // Simple polyfill using JSON for our test purposes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.structuredClone = (obj: any): any =>
    JSON.parse(JSON.stringify(obj));
}

// Helper function to delete all entries from the database
async function clearDatabase() {
  try {
    const entries = await indexedDBService.getAllExecutionHistory();
    // Use Promise.all instead of for loop to satisfy ESLint
    await Promise.all(
      entries.map((entry) => indexedDBService.deleteExecutionHistory(entry.id)),
    );
  } catch (error) {
    // Use a more test-friendly approach than console.error
    throw new Error(`Failed to clear database: ${error}`);
  }
}

describe('IndexedDBService (Real Implementation)', () => {
  beforeEach(async () => {
    // Initialize the database before each test
    await indexedDBService.init();
    // Clear any existing data
    await clearDatabase();
  });

  describe('init', () => {
    it('should initialize the database', async () => {
      // Since we already call init in beforeEach, we just need to verify
      // that we can call it again without errors
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

      // Add the entry
      const resultId = await indexedDBService.addExecutionHistory(entry);
      expect(resultId).toBe(entry.id);

      // Retrieve the entry
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
      // First, add an entry
      const entry: ExecutionHistoryEntry = {
        id: 'test-id-456',
        dtName: 'test-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };
      await indexedDBService.addExecutionHistory(entry);

      // Now update it
      const updatedEntry = {
        ...entry,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [{ jobName: 'job1', log: 'log content' }],
      };
      await indexedDBService.updateExecutionHistory(updatedEntry);

      // Retrieve and verify the update
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
      // Add multiple entries for the same DT
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

      // Add all entries using Promise.all instead of for loop
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
      // Add multiple entries
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

      // Add all entries using Promise.all
      await Promise.all(
        entries.map((entry) => indexedDBService.addExecutionHistory(entry)),
      );

      // Retrieve all entries
      const result = await indexedDBService.getAllExecutionHistory();

      // Verify results
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

      // Verify it's gone
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

      // Add all entries using Promise.all
      await Promise.all(
        entries.map((entry) => indexedDBService.addExecutionHistory(entry)),
      );

      // Delete by DT name
      await indexedDBService.deleteExecutionHistoryByDTName(dtName);

      // Verify the entries for the deleted DT are gone
      const deletedEntries =
        await indexedDBService.getExecutionHistoryByDTName(dtName);
      expect(deletedEntries.length).toBe(0);

      // Verify other entries still exist
      const keptEntry =
        await indexedDBService.getExecutionHistoryById('keep-dt');
      expect(keptEntry).not.toBeNull();
    });
  });
});
