import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { JobLog } from 'model/backend/gitlab/types/executionHistory';

export interface DigitalTwinData {
  DTName: string;
  description: string;
  jobLogs: JobLog[];
  pipelineCompleted: boolean;
  pipelineLoading: boolean;
  pipelineId?: number;
  currentExecutionId?: string;
  lastExecutionStatus?: string;
  gitlabProjectId?: number | null;
}

interface DigitalTwinState {
  [key: string]: DigitalTwinData;
}

interface DigitalTwinSliceState {
  digitalTwin: DigitalTwinState;
  shouldFetchDigitalTwins: boolean;
}

const initialState: DigitalTwinSliceState = {
  digitalTwin: {},
  shouldFetchDigitalTwins: true,
};

const digitalTwinSlice = createSlice({
  name: 'digitalTwin',
  initialState,
  reducers: {
    setDigitalTwin: (
      state,
      action: PayloadAction<{
        assetName: string;
        digitalTwin: DigitalTwinData;
      }>,
    ) => {
      state.digitalTwin[action.payload.assetName] = action.payload.digitalTwin;
    },
    setJobLogs: (
      state,
      action: PayloadAction<{ assetName: string; jobLogs: JobLog[] }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.jobLogs = action.payload.jobLogs;
      }
    },
    setPipelineCompleted: (
      state,
      action: PayloadAction<{ assetName: string; pipelineCompleted: boolean }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.pipelineCompleted = action.payload.pipelineCompleted;
      }
    },
    setPipelineLoading: (
      state,
      action: PayloadAction<{ assetName: string; pipelineLoading: boolean }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.pipelineLoading = action.payload.pipelineLoading;
      }
    },
    updateDescription: (
      state,
      action: PayloadAction<{ assetName: string; description: string }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.description = action.payload.description;
      }
    },
    setShouldFetchDigitalTwins: (state, action: PayloadAction<boolean>) => {
      state.shouldFetchDigitalTwins = action.payload;
    },
  },
});

export const {
  setDigitalTwin,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
  updateDescription,
  setShouldFetchDigitalTwins,
} = digitalTwinSlice.actions;

export default digitalTwinSlice.reducer;
