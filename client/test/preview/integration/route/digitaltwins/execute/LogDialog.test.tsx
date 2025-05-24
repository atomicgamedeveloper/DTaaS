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
  setJobLogs,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import executionHistoryReducer from 'model/backend/gitlab/state/executionHistory.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

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

  it('renders the LogDialog with logs available', async () => {
    store.dispatch(
      setJobLogs({
        assetName,
        jobLogs: [{ jobName: 'job', log: 'testLog' }],
      }),
    );

    await renderLogDialog();

    // Click on the Logs tab to show logs
    const logsTab = screen.getByRole('tab', { name: /Logs/i });
    await act(async () => {
      fireEvent.click(logsTab);
    });

    // Wait for loading to complete and logs to appear
    await waitFor(() => {
      expect(screen.getByText(/mockedDTName log/i)).toBeInTheDocument();
      expect(screen.getByText(/job/i)).toBeInTheDocument();
      expect(screen.getByText(/testLog/i)).toBeInTheDocument();
    });
  });

  it('renders the LogDialog with no logs available', async () => {
    store.dispatch(
      setJobLogs({
        assetName,
        jobLogs: [],
      }),
    );

    await renderLogDialog();

    // Click on the Logs tab to show logs
    const logsTab = screen.getByRole('tab', { name: /Logs/i });
    await act(async () => {
      fireEvent.click(logsTab);
    });

    // Wait for loading to complete and "No logs available" message to appear
    await waitFor(() => {
      expect(screen.getByText(/No logs available/i)).toBeInTheDocument();
    });
  });

  it('handles button click', async () => {
    store.dispatch(
      setJobLogs({
        assetName,
        jobLogs: [{ jobName: 'create', log: 'create log' }],
      }),
    );

    await renderLogDialog();

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(setShowLog).toHaveBeenCalled();
  });
});
