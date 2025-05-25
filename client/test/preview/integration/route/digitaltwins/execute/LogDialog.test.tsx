import * as React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import executionHistoryReducer, {
  setExecutionHistoryEntries,
} from 'model/backend/gitlab/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('database/digitalTwins', () => ({
  getExecutionHistoryByDTName: jest.fn().mockResolvedValue([]),
  getAllExecutionHistory: jest.fn().mockResolvedValue([]),
  addExecutionHistory: jest.fn().mockResolvedValue(undefined),
  updateExecutionHistory: jest.fn().mockResolvedValue(undefined),
  deleteExecutionHistory: jest.fn().mockResolvedValue(undefined),
}));

const store = configureStore({
  reducer: combineReducers({
    digitalTwin: digitalTwinReducer,
    executionHistory: executionHistoryReducer,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  preloadedState: {
    executionHistory: {
      entries: [],
      selectedExecutionId: null,
      loading: false,
      error: null,
    },
  },
});

describe('LogDialog', () => {
  const assetName = 'mockedDTName';
  const setShowLog = jest.fn();

  const renderLogDialog = async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <LogDialog name={assetName} showLog={true} setShowLog={setShowLog} />
        </Provider>,
      );
    });
  };

  beforeEach(() => {
    store.dispatch(
      setDigitalTwin({
        assetName: 'mockedDTName',
        digitalTwin: mockDigitalTwin,
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the LogDialog with execution history', async () => {
    store.dispatch(
      setExecutionHistoryEntries([
        {
          id: 'test-execution-1',
          dtName: assetName,
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [{ jobName: 'job', log: 'testLog' }],
        },
      ]),
    );

    await renderLogDialog();

    await waitFor(() => {
      expect(
        screen.getByText(/MockedDTName Execution History/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    });
  });

  it('renders the LogDialog with empty execution history', async () => {
    store.dispatch(setExecutionHistoryEntries([]));

    await renderLogDialog();

    await waitFor(() => {
      expect(
        screen.getByText(/MockedDTName Execution History/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No execution history found/i),
      ).toBeInTheDocument();
    });
  });

  it('handles button click', async () => {
    store.dispatch(
      setExecutionHistoryEntries([
        {
          id: 'test-execution-2',
          dtName: assetName,
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [{ jobName: 'create', log: 'create log' }],
        },
      ]),
    );

    await renderLogDialog();

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(setShowLog).toHaveBeenCalled();
  });
});
