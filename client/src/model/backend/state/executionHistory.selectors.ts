import { createSelector } from '@reduxjs/toolkit';
import type { ExecutionHistoryState } from 'model/backend/state/executionHistory.slice';

type ExecutionStoreSlice = { executionHistory: ExecutionHistoryState };

export const selectExecutionHistoryEntries = (state: ExecutionStoreSlice) =>
  state.executionHistory.entries;

export const selectExecutionHistoryByDTName = (dtName: string) =>
  createSelector(
    [(state: ExecutionStoreSlice) => state.executionHistory.entries],
    (entries) => entries.filter((entry) => entry.dtName === dtName),
  );

export const selectExecutionHistoryById = (id: string) =>
  createSelector(
    [(state: ExecutionStoreSlice) => state.executionHistory.entries],
    (entries) => entries.find((entry) => entry.id === id),
  );

// Gets selected execution ID
export const selectSelectedExecutionId = (state: ExecutionStoreSlice) =>
  state.executionHistory.selectedExecutionId;

export const selectSelectedExecution = createSelector(
  [
    (state: ExecutionStoreSlice) => state.executionHistory.entries,
    (state: ExecutionStoreSlice) => state.executionHistory.selectedExecutionId,
  ],
  (entries, selectedId) => {
    if (!selectedId) return null;
    return entries.find((entry) => entry.id === selectedId);
  },
);

export const selectExecutionHistoryLoading = (state: ExecutionStoreSlice) =>
  state.executionHistory.loading;

export const selectExecutionHistoryError = (state: ExecutionStoreSlice) =>
  state.executionHistory.error;
