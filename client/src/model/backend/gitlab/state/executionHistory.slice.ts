import {
  PayloadAction,
  createSlice,
  ThunkAction,
  Action,
  createSelector,
} from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import {
  ExecutionHistoryEntry,
  ExecutionStatus,
  JobLog,
} from 'preview/model/executionHistory';
import indexedDBService from 'database/digitalTwins';
import { selectDigitalTwinByName } from 'model/backend/gitlab/state/digitalTwin.slice';

type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

interface ExecutionHistoryState {
  entries: ExecutionHistoryEntry[];
  selectedExecutionId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ExecutionHistoryState = {
  entries: [],
  selectedExecutionId: null,
  loading: false,
  error: null,
};

const executionHistorySlice = createSlice({
  name: 'executionHistory',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setExecutionHistoryEntries: (
      state,
      action: PayloadAction<ExecutionHistoryEntry[]>,
    ) => {
      state.entries = action.payload;
    },
    setExecutionHistoryEntriesForDT: (
      state,
      action: PayloadAction<{ dtName: string; entries: ExecutionHistoryEntry[] }>,
    ) => {
      state.entries = state.entries.filter(
        (entry) => entry.dtName !== action.payload.dtName,
      );
      state.entries.push(...action.payload.entries);
    },
    addExecutionHistoryEntry: (
      state,
      action: PayloadAction<ExecutionHistoryEntry>,
    ) => {
      state.entries.push(action.payload);
    },
    updateExecutionHistoryEntry: (
      state,
      action: PayloadAction<ExecutionHistoryEntry>,
    ) => {
      const index = state.entries.findIndex(
        (entry) => entry.id === action.payload.id,
      );
      if (index !== -1) {
        state.entries[index] = action.payload;
      }
    },
    updateExecutionStatus: (
      state,
      action: PayloadAction<{ id: string; status: ExecutionStatus }>,
    ) => {
      const index = state.entries.findIndex(
        (entry) => entry.id === action.payload.id,
      );
      if (index !== -1) {
        state.entries[index].status = action.payload.status;
      }
    },
    updateExecutionLogs: (
      state,
      action: PayloadAction<{ id: string; logs: JobLog[] }>,
    ) => {
      const index = state.entries.findIndex(
        (entry) => entry.id === action.payload.id,
      );
      if (index !== -1) {
        state.entries[index].jobLogs = action.payload.logs;
      }
    },
    removeExecutionHistoryEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter(
        (entry) => entry.id !== action.payload,
      );
    },
    setSelectedExecutionId: (state, action: PayloadAction<string | null>) => {
      state.selectedExecutionId = action.payload;
    },
    clearEntries: (state) => {
      state.entries = [];
      state.selectedExecutionId = null;
    },
  },
});

// Thunks
export const fetchExecutionHistory =
  (dtName: string): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const entries =
        await indexedDBService.getExecutionHistoryByDTName(dtName);
      dispatch(setExecutionHistoryEntriesForDT({ dtName, entries }));

      dispatch(checkRunningExecutions());

      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to fetch execution history: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const fetchAllExecutionHistory = (): AppThunk => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const entries = await indexedDBService.getAllExecutionHistory();
    dispatch(setExecutionHistoryEntries(entries));

    dispatch(checkRunningExecutions());

    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(`Failed to fetch all execution history: ${error}`));
  } finally {
    dispatch(setLoading(false));
  }
};

export const addExecution =
  (entry: ExecutionHistoryEntry): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await indexedDBService.addExecutionHistory(entry);
      dispatch(addExecutionHistoryEntry(entry));
      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to add execution: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const updateExecution =
  (entry: ExecutionHistoryEntry): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await indexedDBService.updateExecutionHistory(entry);
      dispatch(updateExecutionHistoryEntry(entry));
      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to update execution: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const removeExecution =
  (id: string): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const execution = state.executionHistory.entries.find(
      (entry) => entry.id === id,
    );

    if (!execution) {
      return;
    }

    dispatch(removeExecutionHistoryEntry(id));

    try {
      await indexedDBService.deleteExecutionHistory(id);
      dispatch(setError(null));
    } catch (error) {
      if (execution) {
        dispatch(addExecutionHistoryEntry(execution));
      }
      dispatch(setError(`Failed to remove execution: ${error}`));
    }
  };

export const checkRunningExecutions =
  (): AppThunk => async (dispatch, getState) => {
    const state = getState();
    const runningExecutions = state.executionHistory.entries.filter(
      (entry) => entry.status === ExecutionStatus.RUNNING,
    );

    if (runningExecutions.length === 0) {
      return;
    }

    const { fetchLogsAndUpdateExecution } = await import(
      'model/backend/gitlab/execution/pipelineUtils'
    );

    await Promise.all(
      runningExecutions.map(async (execution) => {
        try {
          const digitalTwin = selectDigitalTwinByName(execution.dtName)(state);
          if (!digitalTwin) {
            return;
          }

          const parentPipelineStatus =
            await digitalTwin.gitlabInstance.getPipelineStatus(
              digitalTwin.gitlabInstance.projectId!,
              execution.pipelineId,
            );

          if (parentPipelineStatus === 'failed') {
            await fetchLogsAndUpdateExecution(
              digitalTwin,
              execution.pipelineId,
              execution.id,
              ExecutionStatus.FAILED,
              dispatch,
            );
            return;
          }

          if (parentPipelineStatus !== 'success') {
            return;
          }

          const childPipelineId = execution.pipelineId + 1;
          try {
            const childPipelineStatus =
              await digitalTwin.gitlabInstance.getPipelineStatus(
                digitalTwin.gitlabInstance.projectId!,
                childPipelineId,
              );

            if (
              childPipelineStatus === 'success' ||
              childPipelineStatus === 'failed'
            ) {
              const newStatus =
                childPipelineStatus === 'success'
                  ? ExecutionStatus.COMPLETED
                  : ExecutionStatus.FAILED;

              await fetchLogsAndUpdateExecution(
                digitalTwin,
                childPipelineId,
                execution.id,
                newStatus,
                dispatch,
              );
            }
          } catch (_error) {
            // Child pipeline might not exist yet or other error - silently ignore
          }
        } catch (_error) {
          // Silently ignore errors for individual executions
        }
      }),
    );
  };

export const selectExecutionHistoryEntries = (state: RootState) =>
  state.executionHistory.entries;

export const selectExecutionHistoryByDTName = (dtName: string) =>
  createSelector(
    [(state: RootState) => state.executionHistory.entries],
    (entries) => entries.filter((entry) => entry.dtName === dtName),
  );

// eslint-disable-next-line no-underscore-dangle
export const _selectExecutionHistoryByDTName =
  (dtName: string) => (state: RootState) =>
    state.executionHistory.entries.filter((entry) => entry.dtName === dtName);

export const selectExecutionHistoryById = (id: string) =>
  createSelector(
    [(state: RootState) => state.executionHistory.entries],
    (entries) => entries.find((entry) => entry.id === id),
  );

export const selectSelectedExecutionId = (state: RootState) =>
  state.executionHistory.selectedExecutionId;

export const selectSelectedExecution = createSelector(
  [
    (state: RootState) => state.executionHistory.entries,
    (state: RootState) => state.executionHistory.selectedExecutionId,
  ],
  (entries, selectedId) => {
    if (!selectedId) return null;
    return entries.find((entry) => entry.id === selectedId);
  },
);

export const selectExecutionHistoryLoading = (state: RootState) =>
  state.executionHistory.loading;

export const selectExecutionHistoryError = (state: RootState) =>
  state.executionHistory.error;

export const {
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
} = executionHistorySlice.actions;

export default executionHistorySlice.reducer;
