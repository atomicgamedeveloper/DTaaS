import executionHistoryReducer, {
  setLoading,
  setError,
  setExecutionHistoryEntries,
  setExecutionHistoryEntriesForDT,
  addExecutionHistoryEntry,
  updateExecutionHistoryEntry,
  updateExecutionStatus,
  updateExecutionLogs,
  removeExecutionHistoryEntry,
  setSelectedExecutionId,
  clearEntries,
  fetchExecutionHistory,
  removeExecution,
  selectExecutionHistoryEntries,
  selectExecutionHistoryByDTName,
  selectExecutionHistoryById,
  selectSelectedExecutionId,
  selectSelectedExecution,
  selectExecutionHistoryLoading,
  selectExecutionHistoryError,
} from 'model/backend/gitlab/state/executionHistory.slice';
import {
  ExecutionHistoryEntry,
  ExecutionStatus,
} from 'model/backend/gitlab/types/executionHistory';
import { configureStore } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

// Mock the IndexedDB service
jest.mock('database/digitalTwins', () => ({
  __esModule: true,
  default: {
    getExecutionHistoryByDTName: jest.fn(),
    deleteExecutionHistory: jest.fn(),
    getAllExecutionHistory: jest.fn(),
    addExecutionHistory: jest.fn(),
    updateExecutionHistory: jest.fn(),
  },
}));

const createTestStore = () =>
  configureStore({
    reducer: {
      executionHistory: executionHistoryReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'executionHistory/addExecutionHistoryEntry',
            'executionHistory/updateExecutionHistoryEntry',
            'executionHistory/setExecutionHistoryEntries',
            'executionHistory/updateExecutionLogs',
            'executionHistory/updateExecutionStatus',
            'executionHistory/setLoading',
            'executionHistory/setError',
            'executionHistory/setSelectedExecutionId',
          ],
        },
      }),
  });

type TestStore = ReturnType<typeof createTestStore>;

describe('executionHistory slice', () => {
  let store: TestStore;

  beforeEach(() => {
    store = createTestStore();
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

    it('should replace entries when using setExecutionHistoryEntries', () => {
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

      // Set first entries
      store.dispatch(setExecutionHistoryEntries(entriesDT1));
      expect(store.getState().executionHistory.entries.length).toBe(2);

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

      store.dispatch(setExecutionHistoryEntries(entriesDT2));

      const stateEntries = store.getState().executionHistory.entries;
      expect(stateEntries.length).toBe(1);
      expect(stateEntries).toEqual(entriesDT2);
      expect(
        stateEntries.find((e: ExecutionHistoryEntry) => e.id === '1'),
      ).toBeUndefined();
      expect(
        stateEntries.find((e: ExecutionHistoryEntry) => e.id === '2'),
      ).toBeUndefined();
      expect(
        stateEntries.find((e: ExecutionHistoryEntry) => e.id === '3'),
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

    it('should handle setExecutionHistoryEntriesForDT', () => {
      const initialEntries = [
        {
          id: '1',
          dtName: 'dt1',
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
        {
          id: '2',
          dtName: 'dt2',
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
      ];
      store.dispatch(setExecutionHistoryEntries(initialEntries));

      const newEntriesForDT1 = [
        {
          id: '3',
          dtName: 'dt1',
          pipelineId: 789,
          timestamp: Date.now(),
          status: ExecutionStatus.FAILED,
          jobLogs: [],
        },
      ];

      store.dispatch(
        setExecutionHistoryEntriesForDT({
          dtName: 'dt1',
          entries: newEntriesForDT1,
        }),
      );

      const state = store.getState().executionHistory.entries;
      expect(state.length).toBe(2); // dt2 entry + new dt1 entry
      expect(state.find((e) => e.id === '1')).toBeUndefined(); // old dt1 entry removed
      expect(state.find((e) => e.id === '2')).toBeDefined(); // dt2 entry preserved
      expect(state.find((e) => e.id === '3')).toBeDefined(); // new dt1 entry added
    });

    it('should handle clearEntries', () => {
      const entries = [
        {
          id: '1',
          dtName: 'test-dt',
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
      ];

      store.dispatch(setExecutionHistoryEntries(entries));
      expect(store.getState().executionHistory.entries.length).toBe(1);

      store.dispatch(clearEntries());
      expect(store.getState().executionHistory.entries).toEqual([]);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      const entries = [
        {
          id: '1',
          dtName: 'dt1',
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
        {
          id: '2',
          dtName: 'dt2',
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        },
        {
          id: '3',
          dtName: 'dt1',
          pipelineId: 789,
          timestamp: Date.now(),
          status: ExecutionStatus.FAILED,
          jobLogs: [],
        },
      ];
      store.dispatch(setExecutionHistoryEntries(entries));
      store.dispatch(setSelectedExecutionId('2'));
      store.dispatch(setLoading(true));
      store.dispatch(setError('Test error'));
    });

    it('should select all execution history entries', () => {
      const entries = selectExecutionHistoryEntries(
        store.getState() as unknown as RootState,
      );
      expect(entries.length).toBe(3);
    });

    it('should select execution history by DT name', () => {
      const dt1Entries = selectExecutionHistoryByDTName('dt1')(
        store.getState() as unknown as RootState,
      );
      expect(dt1Entries.length).toBe(2);
      expect(dt1Entries.every((e) => e.dtName === 'dt1')).toBe(true);
    });

    it('should select execution history by ID', () => {
      const entry = selectExecutionHistoryById('2')(
        store.getState() as unknown as RootState,
      );
      expect(entry?.id).toBe('2');
      expect(entry?.dtName).toBe('dt2');
    });

    it('should select selected execution ID', () => {
      const selectedId = selectSelectedExecutionId(
        store.getState() as unknown as RootState,
      );
      expect(selectedId).toBe('2');
    });

    it('should select selected execution', () => {
      const selectedExecution = selectSelectedExecution(
        store.getState() as unknown as RootState,
      );
      expect(selectedExecution?.id).toBe('2');
      expect(selectedExecution?.dtName).toBe('dt2');
    });

    it('should select loading state', () => {
      const loading = selectExecutionHistoryLoading(
        store.getState() as unknown as RootState,
      );
      expect(loading).toBe(true);
    });

    it('should select error state', () => {
      const error = selectExecutionHistoryError(
        store.getState() as unknown as RootState,
      );
      expect(error).toBe('Test error');
    });
  });

  describe('async thunks', () => {
    let mockIndexedDBService: jest.Mocked<
      typeof import('database/digitalTwins').default
    >;

    beforeEach(() => {
      jest.clearAllMocks();
      mockIndexedDBService = jest.requireMock('database/digitalTwins').default;
    });

    it('should handle fetchExecutionHistory success', async () => {
      const mockEntries = [
        {
          id: '1',
          dtName: 'test-dt',
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        },
      ];

      mockIndexedDBService.getExecutionHistoryByDTName.mockResolvedValue(
        mockEntries,
      );

      await (store.dispatch as (action: unknown) => Promise<void>)(
        fetchExecutionHistory('test-dt'),
      );

      const state = store.getState().executionHistory;
      expect(state.entries).toEqual(mockEntries);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetchExecutionHistory error', async () => {
      const errorMessage = 'Database error';
      mockIndexedDBService.getExecutionHistoryByDTName.mockRejectedValue(
        new Error(errorMessage),
      );

      await (store.dispatch as (action: unknown) => Promise<void>)(
        fetchExecutionHistory('test-dt'),
      );

      const state = store.getState().executionHistory;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(
        `Failed to fetch execution history: Error: ${errorMessage}`,
      );
    });

    it('should handle removeExecution success', async () => {
      const entry = {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      };

      store.dispatch(addExecutionHistoryEntry(entry));
      mockIndexedDBService.deleteExecutionHistory.mockResolvedValue(undefined);

      await (store.dispatch as (action: unknown) => Promise<void>)(
        removeExecution('1'),
      );

      const state = store.getState().executionHistory;
      expect(state.entries.find((e) => e.id === '1')).toBeUndefined();
      expect(state.error).toBeNull();
    });

    it('should handle removeExecution error', async () => {
      const entry = {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      };

      store.dispatch(addExecutionHistoryEntry(entry));
      const errorMessage = 'Delete failed';
      mockIndexedDBService.deleteExecutionHistory.mockRejectedValue(
        new Error(errorMessage),
      );

      await (store.dispatch as (action: unknown) => Promise<void>)(
        removeExecution('1'),
      );

      const state = store.getState().executionHistory;
      expect(state.entries.find((e) => e.id === '1')).toBeDefined();
      expect(state.error).toBe(
        `Failed to remove execution: Error: ${errorMessage}`,
      );
    });
  });
});
