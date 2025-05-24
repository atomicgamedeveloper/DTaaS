import executionHistoryReducer, {
  setLoading,
  setError,
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  updateExecutionHistoryEntry,
  updateExecutionStatus,
  updateExecutionLogs,
  removeExecutionHistoryEntry,
  setSelectedExecutionId,
} from 'model/backend/gitlab/state/executionHistory.slice';
import {
  ExecutionHistoryEntry,
  ExecutionStatus,
} from 'preview/model/executionHistory';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';

// Define the state structure for the test store
interface TestState {
  executionHistory: {
    entries: ExecutionHistoryEntry[];
    selectedExecutionId: string | null;
    loading: boolean;
    error: string | null;
  };
}

describe('executionHistory slice', () => {
  // Create a new store for each test with proper typing
  let store: EnhancedStore<TestState>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        executionHistory: executionHistoryReducer,
      },
    }) as EnhancedStore<TestState>;
  });

  describe('reducers', () => {
    it('should handle setLoading', () => {
      store.dispatch(setLoading(true));
      expect(store.getState().executionHistory.loading).toBe(true);

      store.dispatch(setLoading(false));
      expect(store.getState().executionHistory.loading).toBe(false);
    });

    it('should handle setError', () => {
      const errorMessage = 'Test error message';
      store.dispatch(setError(errorMessage));
      expect(store.getState().executionHistory.error).toBe(errorMessage);

      store.dispatch(setError(null));
      expect(store.getState().executionHistory.error).toBeNull();
    });

    it('should handle setExecutionHistoryEntries', () => {
      const entries = [
        {
          id: '1',
          dtName: 'test-dt',
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
        {
          id: '2',
          dtName: 'test-dt',
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
      ];

      store.dispatch(setExecutionHistoryEntries(entries));
      expect(store.getState().executionHistory.entries).toEqual(entries);
    });

    it('should merge entries when using setExecutionHistoryEntries', () => {
      // First set of entries for digital twin 1
      const entriesDT1 = [
        {
          id: '1',
          dtName: 'digital-twin-1',
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
        {
          id: '2',
          dtName: 'digital-twin-1',
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
      ];

      // Add first set of entries
      store.dispatch(setExecutionHistoryEntries(entriesDT1));

      // Second set of entries for digital twin 2
      const entriesDT2 = [
        {
          id: '3',
          dtName: 'digital-twin-2',
          pipelineId: 789,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
      ];

      // Add second set of entries
      store.dispatch(setExecutionHistoryEntries(entriesDT2));

      // Verify that both sets of entries are in the state
      const stateEntries = store.getState().executionHistory.entries;
      expect(stateEntries.length).toBe(3);
      expect(stateEntries).toEqual(
        expect.arrayContaining([...entriesDT1, ...entriesDT2]),
      );

      // Update an existing entry
      const updatedEntry = {
        ...entriesDT1[0],
        status: ExecutionStatus.FAILED,
      };

      // Add the updated entry
      store.dispatch(setExecutionHistoryEntries([updatedEntry]));

      // Verify that the entry was updated and others remain
      const updatedStateEntries = store.getState().executionHistory.entries;
      expect(updatedStateEntries.length).toBe(3);
      expect(
        updatedStateEntries.find((e: ExecutionHistoryEntry) => e.id === '1')
          ?.status,
      ).toBe(ExecutionStatus.FAILED);
      expect(
        updatedStateEntries.find((e: ExecutionHistoryEntry) => e.id === '2'),
      ).toBeDefined();
      expect(
        updatedStateEntries.find((e: ExecutionHistoryEntry) => e.id === '3'),
      ).toBeDefined();
    });

    it('should handle addExecutionHistoryEntry', () => {
      const entry = {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      store.dispatch(addExecutionHistoryEntry(entry));
      expect(store.getState().executionHistory.entries).toEqual([entry]);
    });

    it('should handle updateExecutionHistoryEntry', () => {
      const entry = {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      store.dispatch(addExecutionHistoryEntry(entry));

      const updatedEntry = {
        ...entry,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [{ jobName: 'test-job', log: 'test log' }],
      };

      store.dispatch(updateExecutionHistoryEntry(updatedEntry));
      expect(store.getState().executionHistory.entries).toEqual([updatedEntry]);
    });

    it('should handle updateExecutionStatus', () => {
      const entry = {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      store.dispatch(addExecutionHistoryEntry(entry));
      store.dispatch(
        updateExecutionStatus({ id: '1', status: ExecutionStatus.COMPLETED }),
      );

      const updatedEntry = store
        .getState()
        .executionHistory.entries.find(
          (e: ExecutionHistoryEntry) => e.id === '1',
        );
      expect(updatedEntry?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should handle updateExecutionLogs', () => {
      const entry = {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      store.dispatch(addExecutionHistoryEntry(entry));

      const logs = [{ jobName: 'test-job', log: 'test log' }];
      store.dispatch(updateExecutionLogs({ id: '1', logs }));

      const updatedEntry = store
        .getState()
        .executionHistory.entries.find(
          (e: ExecutionHistoryEntry) => e.id === '1',
        );
      expect(updatedEntry?.jobLogs).toEqual(logs);
    });

    it('should handle removeExecutionHistoryEntry', () => {
      const entry1 = {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      };

      const entry2 = {
        id: '2',
        dtName: 'test-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      store.dispatch(setExecutionHistoryEntries([entry1, entry2]));
      store.dispatch(removeExecutionHistoryEntry('1'));

      expect(store.getState().executionHistory.entries).toEqual([entry2]);
    });

    it('should handle setSelectedExecutionId', () => {
      store.dispatch(setSelectedExecutionId('1'));
      expect(store.getState().executionHistory.selectedExecutionId).toBe('1');

      store.dispatch(setSelectedExecutionId(null));
      expect(store.getState().executionHistory.selectedExecutionId).toBeNull();
    });
  });
});
