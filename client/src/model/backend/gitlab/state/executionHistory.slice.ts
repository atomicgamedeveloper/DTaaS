import {
  PayloadAction,
  createSlice,
  ThunkAction,
  Action,
} from '@reduxjs/toolkit';
import {
  DTExecutionResult,
  ExecutionStatus,
  JobLog,
} from 'model/backend/gitlab/types/executionHistory';
import { DigitalTwinData } from 'model/backend/gitlab/state/digitalTwin.slice';
import indexedDBService from 'database/digitalTwins';

type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  {
    executionHistory: ExecutionHistoryState;
    digitalTwin: { digitalTwin: Record<string, DigitalTwinData> };
  },
  unknown,
  Action<string>
>;

interface ExecutionHistoryState {
  entries: DTExecutionResult[];
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
      action: PayloadAction<DTExecutionResult[]>,
    ) => {
      state.entries = action.payload;
    },
    setExecutionHistoryEntriesForDT: (
      state,
      action: PayloadAction<{
        dtName: string;
        entries: DTExecutionResult[];
      }>,
    ) => {
      state.entries = state.entries.filter(
        (entry) => entry.dtName !== action.payload.dtName,
      );
      state.entries.push(...action.payload.entries);
    },
    addExecutionHistoryEntry: (
      state,
      action: PayloadAction<DTExecutionResult>,
    ) => {
      state.entries.push(action.payload);
    },
    updateExecutionHistoryEntry: (
      state,
      action: PayloadAction<DTExecutionResult>,
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
      const entries = await indexedDBService.getByDTName(dtName);
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
    const entries = await indexedDBService.getAll();
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
  (entry: DTExecutionResult): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await indexedDBService.add(entry);
      dispatch(addExecutionHistoryEntry(entry));
      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to add execution: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const updateExecution =
  (entry: DTExecutionResult): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await indexedDBService.update(entry);
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
      (entry: DTExecutionResult) => entry.id === id,
    );

    if (!execution) {
      return;
    }

    dispatch(removeExecutionHistoryEntry(id));

    try {
      await indexedDBService.delete(id);
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
      (entry: DTExecutionResult) => entry.status === ExecutionStatus.RUNNING,
    );

    if (runningExecutions.length === 0) {
      return;
    }

    try {
      const module = await import(
        'model/backend/gitlab/services/ExecutionStatusService'
      );
      const updatedExecutions = await module.default.checkRunningExecutions(
        runningExecutions,
        state.digitalTwin.digitalTwin,
      );

      updatedExecutions.forEach((updatedExecution: DTExecutionResult) => {
        dispatch(updateExecutionHistoryEntry(updatedExecution));
      });
    } catch (error) {
      dispatch(setError(`Failed to check execution status: ${error}`));
    }
  };

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
