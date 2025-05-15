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
} from 'preview/store/executionHistory.slice';
import { ExecutionStatus } from 'preview/model/executionHistory';
import { configureStore } from '@reduxjs/toolkit';

describe('executionHistory slice', () => {
  const store = configureStore({
    reducer: {
      executionHistory: executionHistoryReducer,
    },
  });

  beforeEach(() => {
    // Reset the store
    store.dispatch(setExecutionHistoryEntries([]));
    store.dispatch(setLoading(false));
    store.dispatch(setError(null));
    store.dispatch(setSelectedExecutionId(null));
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
        .executionHistory.entries.find((e) => e.id === '1');
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
        .executionHistory.entries.find((e) => e.id === '1');
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
