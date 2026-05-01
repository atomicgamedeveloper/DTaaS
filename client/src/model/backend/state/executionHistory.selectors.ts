import { createSelector } from '@reduxjs/toolkit';
import { ModelRootState } from 'model/store/modelRootState';

export const selectExecutionHistoryEntries = (state: ModelRootState) =>
  state.executionHistory.entries;

export const selectExecutionHistoryByDTName = (dtName: string) =>
  createSelector(
    [(state: ModelRootState) => state.executionHistory.entries],
    (entries) => entries.filter((entry) => entry.dtName === dtName),
  );

export const selectExecutionHistoryById = (id: string) =>
  createSelector(
    [(state: ModelRootState) => state.executionHistory.entries],
    (entries) => entries.find((entry) => entry.id === id),
  );

// Gets selected execution ID
export const selectSelectedExecutionId = (state: ModelRootState) =>
  state.executionHistory.selectedExecutionId;

export const selectSelectedExecution = createSelector(
  [
    (state: ModelRootState) => state.executionHistory.entries,
    (state: ModelRootState) => state.executionHistory.selectedExecutionId,
  ],
  (entries, selectedId) => {
    if (!selectedId) return null;
    return entries.find((entry) => entry.id === selectedId);
  },
);

export const selectExecutionHistoryLoading = (state: ModelRootState) =>
  state.executionHistory.loading;

export const selectExecutionHistoryError = (state: ModelRootState) =>
  state.executionHistory.error;
