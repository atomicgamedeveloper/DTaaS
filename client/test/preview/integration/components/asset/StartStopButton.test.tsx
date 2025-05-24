import {
  fireEvent,
  render,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import StartStopButton from 'preview/components/asset/StartStopButton';
import * as React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
  setPipelineLoading,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import executionHistoryReducer, {
  addExecutionHistoryEntry,
} from 'model/backend/gitlab/state/executionHistory.slice';
import { handleStart } from 'model/backend/gitlab/execution/pipelineHandler';
import '@testing-library/jest-dom';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { ExecutionStatus } from 'preview/model/executionHistory';

jest.mock('model/backend/gitlab/execution/pipelineHandler', () => ({
  handleStart: jest.fn(),
}));

jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

const createStore = () =>
  configureStore({
    reducer: combineReducers({
      digitalTwin: digitalTwinReducer,
      executionHistory: executionHistoryReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

describe('StartStopButton Integration Test', () => {
  let store: ReturnType<typeof createStore>;
  const assetName = 'mockedDTName';
  const setLogButtonDisabled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    store = createStore();
  });

  const renderComponent = () => {
    act(() => {
      render(
        <Provider store={store}>
          <StartStopButton
            assetName={assetName}
            setLogButtonDisabled={setLogButtonDisabled}
          />
        </Provider>,
      );
    });
  };

  it('renders only the Start button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('handles button click', async () => {
    renderComponent();
    const startButton = screen.getByRole('button', { name: /Start/i });

    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(handleStart).toHaveBeenCalled();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('renders the circular progress when pipelineLoading is true', async () => {
    await act(async () => {
      store.dispatch(
        setDigitalTwin({
          assetName,
          digitalTwin: mockDigitalTwin,
        }),
      );
      store.dispatch(setPipelineLoading({ assetName, pipelineLoading: true }));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByTestId('circular-progress')).toBeInTheDocument();
    });
  });

  it('shows running execution count when there are running executions', async () => {
    // Add running executions to the store
    await act(async () => {
      store.dispatch(
        addExecutionHistoryEntry({
          id: '1',
          dtName: assetName,
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        }),
      );

      store.dispatch(
        addExecutionHistoryEntry({
          id: '2',
          dtName: assetName,
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        }),
      );
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByTestId('circular-progress')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });

  it('does not show loading indicator when there are only completed executions', async () => {
    // Add completed executions to the store
    await act(async () => {
      store.dispatch(
        addExecutionHistoryEntry({
          id: '1',
          dtName: assetName,
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        }),
      );
    });

    renderComponent();

    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });
});
