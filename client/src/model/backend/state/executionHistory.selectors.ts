import { createSelector } from '@reduxjs/toolkit';
import type { ModelStoreState } from 'model/store/modelRootState';

export const selectExecutionHistoryEntries = (state: ModelStoreState) =>
  state.executionHistory.entries;

export const selectExecutionHistoryByDTName = (dtName: string) =>
  createSelector(
    [(state: ModelStoreState) => state.executionHistory.entries],
    (entries) => entries.filter((entry) => entry.dtName === dtName),
  );

export const selectExecutionHistoryById = (id: string) =>
  createSelector(
    [(state: ModelStoreState) => state.executionHistory.entries],
    (entries) => entries.find((entry) => entry.id === id),
  );

// Gets selected execution ID
export const selectSelectedExecutionId = (state: ModelStoreState) =>
  state.executionHistory.selectedExecutionId;

export const selectSelectedExecution = createSelector(
  [
    (state: ModelStoreState) => state.executionHistory.entries,
    (state: ModelStoreState) => state.executionHistory.selectedExecutionId,
  ],
  (entries, selectedId) => {
    if (!selectedId) return null;
    return entries.find((entry) => entry.id === selectedId);
  },
);

export const selectExecutionHistoryLoading = (state: ModelStoreState) =>
  state.executionHistory.loading;

export const selectExecutionHistoryError = (state: ModelStoreState) =>
  state.executionHistory.error;
