import {
  PayloadAction,
  createSlice,
  ThunkAction,
  Action,
} from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import {
  ExecutionHistoryEntry,
  ExecutionStatus,
  JobLog,
} from 'preview/model/executionHistory';
import indexedDBService from 'preview/services/indexedDBService';

// Define the AppThunk type for our thunk actions
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
      dispatch(setExecutionHistoryEntries(entries));
      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to fetch execution history: ${error}`));
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
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await indexedDBService.deleteExecutionHistory(id);
      dispatch(removeExecutionHistoryEntry(id));
      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to remove execution: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

// Selectors
export const selectExecutionHistoryEntries = (state: RootState) =>
  state.executionHistory.entries;

export const selectExecutionHistoryByDTName =
  (dtName: string) => (state: RootState) =>
    state.executionHistory.entries.filter((entry) => entry.dtName === dtName);

export const selectExecutionHistoryById = (id: string) => (state: RootState) =>
  state.executionHistory.entries.find((entry) => entry.id === id);

export const selectSelectedExecutionId = (state: RootState) =>
  state.executionHistory.selectedExecutionId;

export const selectSelectedExecution = (state: RootState) => {
  const selectedId = state.executionHistory.selectedExecutionId;
  if (!selectedId) return null;
  return state.executionHistory.entries.find(
    (entry) => entry.id === selectedId,
  );
};

export const selectExecutionHistoryLoading = (state: RootState) =>
  state.executionHistory.loading;

export const selectExecutionHistoryError = (state: RootState) =>
  state.executionHistory.error;

export const {
  setLoading,
  setError,
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  updateExecutionHistoryEntry,
  updateExecutionStatus,
  updateExecutionLogs,
  removeExecutionHistoryEntry,
  setSelectedExecutionId,
} = executionHistorySlice.actions;

export default executionHistorySlice.reducer;
