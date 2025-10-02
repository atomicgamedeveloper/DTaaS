import { screen, render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryButton from 'components/asset/HistoryButton';
import * as React from 'react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import executionHistoryReducer, {
  addExecutionHistoryEntry,
} from 'model/backend/gitlab/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

const createTestStore = () =>
  configureStore({
    reducer: combineReducers({
      executionHistory: executionHistoryReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

describe('LogButton Integration Test', () => {
  const assetName = 'test-asset';
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  const renderLogButton = (
    setShowLog: jest.Mock = jest.fn(),
    historyButtonDisabled = false,
    testAssetName = assetName,
  ) =>
    act(() => {
      render(
        <Provider store={store}>
          <HistoryButton
            setShowLog={setShowLog}
            historyButtonDisabled={historyButtonDisabled}
            assetName={testAssetName}
          />
        </Provider>,
      );
    });

  it('renders the History button', () => {
    renderLogButton();
    expect(
      screen.getByRole('button', { name: /History/i }),
    ).toBeInTheDocument();
  });

  it('handles button click when enabled', () => {
    renderLogButton();

    const logButton = screen.getByRole('button', { name: /History/i });
    act(() => {
      fireEvent.click(logButton);
    });

    expect(logButton).toBeEnabled();
  });

  it('does not handle button click when disabled and no executions', () => {
    renderLogButton(jest.fn(), true);

    const logButton = screen.getByRole('button', { name: /History/i });
    expect(logButton).toBeDisabled();
  });

  it('toggles setShowLog value correctly', () => {
    let toggleValue = false;
    const mockSetShowLog = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });

    renderLogButton(mockSetShowLog);

    const logButton = screen.getByRole('button', { name: /History/i });

    act(() => {
      fireEvent.click(logButton);
    });
    expect(toggleValue).toBe(true);

    act(() => {
      fireEvent.click(logButton);
    });
    expect(toggleValue).toBe(false);
  });

  it('shows badge with execution count when executions exist', async () => {
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

    renderLogButton();

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('enables button when historyButtonDisabled is true but executions exist', async () => {
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

    renderLogButton(jest.fn(), true);

    const logButton = screen.getByRole('button', { name: /History/i });
    expect(logButton).toBeEnabled();
  });
});
